#define FAST_ALLOCATOR_MEMORY 1e8

#include <bits/stdc++.h>
#include <ctime>
#include "optimization.h"

#define pii pair <int, int>
#define rep(i, n) for (int i = 0; i < (int)n; i++)
#define REP(i, n, m) for (int i = (int)n; i < (int)m; i++)
#define prep(i, n) for (int i = 1; i <= (int)n; i++)
#define per(i, n) for (int i = n; i >= 0; i--)
#define pb push_back
#define vi vector <int>
#define fi first
#define se second

typedef long long ll;
typedef long double ld;

using namespace std;

/** CONST **/

const int maxn = (1e3);   // maximum number vertex in graph
const int maxr = 10;      // maximum number vertex in grammar

/** DEFENITIONS **/

struct RFA{
    set <int> st_states[maxr];
    set <int> fi_states[maxr];
    set <int> fi_states_rev[maxr];
    set <pii> trans[maxr];
} rfa;

struct Graph{
    set <int> graph[maxn][maxn];
    set <int> graph_elems[maxn];
    set <int> graph_states;
} graph;

vector <pair <pii, string>> ans;
int used[maxr][maxn];

int labels_num = 0;
map <string, int> label_to_int;
vector <string> labels;

/**  FUNCTIONS **/

void print_ans(bool print, const char* s){
    int cnt = 0;
    for (auto v: ans){
        if (v.se == "S"){
            cnt++;
        }
    }

    cout << endl << "Answer is " << cnt << endl;

    if (print){
        freopen(s, "w", stdout);
        for (auto v: ans){
            cout << v.fi.fi  << " " << v.se << " " << v.fi.se << endl;
        }
    }
}

inline void readBlancLine(int cnt){
    rep(i, cnt){
        char c = ' ';
        while (c != '\n'){
            c = getChar();
        }
    }
}

inline string getLabel(char *cs){
    string s;
    int cntqoute = 0;
    while (*cs != 0){
        if (*cs == '"'){
            cntqoute++;
        } else if (cntqoute == 1){
            s += *cs;
        }
        *cs++;
    }
    return s;
}

inline bool isToken(string token){
    rep(i, token.size()){
        if (isupper(token[i]))
            return true;
    }
    return false;
}

inline void add_label(string s){
    if (!label_to_int.count(s)){
        label_to_int[s] = ++labels_num;
        labels.pb(s);
    }
}

void readGraph(char* filename){
    FILE *f = fopen(filename, "r");
    changeFile(f);

    readBlancLine(3);
    while (true){
        int l = readInt();
        if (l == ERR_READ){
            break;
        }
        rep(i, 3){
            getChar();
        }

        int r = readInt();

        char css[30];
        readLine(css);
        char *cs = css;
        string s = getLabel(cs);

        add_label(s);

        graph.graph[l][r].insert(label_to_int[s]);
        graph.graph_elems[l].insert(r);
        graph.graph_states.insert(l);
        graph.graph_states.insert(r);
    }
    fclose(f);
}

void readGrammar(char* filename){
    FILE *f = fopen(filename, "r");
    changeFile(f);

    readBlancLine(4);
    while (true){
        int l = readInt();
        if (l == ERR_READ){
            break;
        }
        char c = readChar();
        if (c == '-'){
            readChar();
            int r = readInt();
            char css[30];
            readLine(css);
            char *cs = css;
            string s = getLabel(cs);
            add_label(s);
            rfa.trans[l].insert({r, label_to_int[s]});
        } else {
            char css[30];
            readLine(css);
            char *cs = css;
            string s = getLabel(cs);
            add_label(s);
            int label_num = label_to_int[s];
            if (strstr(cs, "green")){
                rfa.st_states[label_num].insert(l);
            }
            if (strstr(cs, "doublecircle")){
                rfa.fi_states[label_num].insert(l);
                rfa.fi_states_rev[l].insert(label_num);
            }
        }
    }
    fclose(f);
}

bool _update(int pos_ks, int pos_g, int nonterm, int iteration){
    bool flag = false;

    queue <pii> pairs_set;
    pairs_set.push({pos_ks, pos_g});
    used[pos_ks][pos_g] = iteration;
    while (!pairs_set.empty()){
        pii p = pairs_set.front();
        pairs_set.pop();
        int rfa_pos = p.fi;
        int gr_pos = p.se;

        if (rfa.fi_states_rev[rfa_pos].count(nonterm)){
            size_t sz = graph.graph[pos_g][gr_pos].size();

            for (auto elem: rfa.fi_states_rev[rfa_pos]){
                graph.graph[pos_g][gr_pos].insert(elem);
                graph.graph_elems[pos_g].insert(gr_pos);
            }

            if (sz < graph.graph[pos_g][gr_pos].size()){
                flag = true;
            }
        }

        for (auto p: rfa.trans[rfa_pos]){
            int rfa_to = p.fi;
            int rfa_label = p.se;

            for (auto gr_to: graph.graph_elems[gr_pos]){
                for (auto gr_label: graph.graph[gr_pos][gr_to]){
                    if (rfa_label == gr_label){
                        if (used[rfa_to][gr_to] != iteration){
                            pairs_set.push({rfa_to, gr_to});
                            used[rfa_to][gr_to] = iteration;
                        }
                    }
                }
            }
        }
    }

    return flag;
}

void glr(){
    bool flag = true;
    int iteration = 0;
    while (flag){
        flag = false;
        for (auto gr_pos: graph.graph_states){
            rep(kv, maxr){
                for (auto rfa_pos: rfa.st_states[kv]){
                    flag |= _update(rfa_pos, gr_pos, kv, ++iteration);
                }
            }
        }
    }

    rep(fr, maxn){
        for (auto to: graph.graph_elems[fr]){
            for (auto token: graph.graph[fr][to]){
                string s = labels[token - 1];
                if (isToken(s)){
                    ans.push_back({{fr, to}, s});
                }
            }
        }
    }
}

int main(int argc, char **argv)
{
    if (argc < 3){
        cout << "wrong number of arguments";
        return 0;
    }

    readGraph(argv[1]);
    readGrammar(argv[2]);

    clock_t start = clock();
    glr();
    clock_t finish = clock();

    cout << setprecision(15) << "Time is: " << (ld)(finish - start) / CLOCKS_PER_SEC << " seconds";
    print_ans(argc > 3, argc > 3 ? argv[3] : "");

	return 0;
}
