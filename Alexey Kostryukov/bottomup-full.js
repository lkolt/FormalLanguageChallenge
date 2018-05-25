const fs = require("fs");
const eol = require("os").EOL;


const MAX_VERTEXES = 1000000000000;


class RFAGrammar {
    constructor(rfaGrammarAsString) {
        this.rfa = this.parse(rfaGrammarAsString); //reversed: A -> BC will be this.productions['BC'] = 'A'
    }

    parse(rfaGrammarAsString) {
        let rfa = {
                startStates: new Map(),
                finalStatesToNonTerm: new Map(),
                graph: [],
                outLabels: []
            },
            lines = rfaGrammarAsString.split(/\r?\n/),
            regexpLabel = /(\d+).*label\s*=\s*"(.+?)"/,
            regexpFinalState = /shape\s*=\s*"doublecircle"/,
            regexpStartState = /color\s*=\s*"green"/;

        for (let line of lines) {
            if (line.length > 0) {
                if (line.indexOf('->') > -1) {
                    let [left, right] = line.split('->'),
                        vertex1 = parseInt(left),
                        rightMatched = right.match(regexpLabel),
                        vertex2 = parseInt(rightMatched[1]),
                        label = rightMatched[2];

                    this.addEdge(vertex1, vertex2, label, rfa);
                } else if (/\d+\[/.test(line)) {
                    let matched = line.match(regexpLabel),
                        vertex = parseInt(matched[1]),
                        label = matched[2];

                    if (regexpFinalState.test(line)) {
                        if (rfa.finalStatesToNonTerm.has(vertex)) {
                            rfa.finalStatesToNonTerm.get(vertex).add(label);
                        } else {
                            rfa.finalStatesToNonTerm.set(vertex, new Set([label]));
                        }
                    }

                    if (regexpStartState.test(line)) {
                        if (rfa.startStates.has(label)) {
                            rfa.startStates.get(label).add(vertex);
                        } else {
                            rfa.startStates.set(label, new Set([vertex]));
                        }
                    }
                }
            }
        }

        return rfa;
    }

    addEdge(vertex1, vertex2, label, rfa) {
        if (rfa.outLabels[vertex1] == null) {
            rfa.outLabels[vertex1] = 0 | (1 << Helper.hash(label));
            rfa.graph[vertex1] = new Map();
        } else {
            rfa.outLabels[vertex1] |= (1 << Helper.hash(label));
        }

        let outForVertex1Labels = rfa.graph[vertex1].get(vertex2);
        if (outForVertex1Labels == null) {
            rfa.graph[vertex1].set(vertex2, new Set([label]));
        } else {
            outForVertex1Labels.add(label);
        }
    }

    static isNonTerminal(str) {
        return isNaN(str[0] * 1) && str[0] == str[0].toUpperCase()
    }
}



class Helper {
    static hasIntersectionSetAndSet(set1, set2) {
        for (let el of set1) {
            if (set2.has(el)) {
                return true;
            }
        }

        return false
    }

    //hashing
    static hash(str) {
        let sum = str.charCodeAt(0);
        for (let i = 0; i < str.length; i++) {
            sum += str.charCodeAt(i);
        }
        return sum % 19;
    }

    static buildMask(set) {
        let mask = 0;
        for (let el of set) {
            mask |= (1 << Helper.hash(el));
        }
        return mask;
    }
}


class Graph {
  constructor(graphAsString) {
    this.graphStructure = [];
    this.outLabels = [];
    this.parse(graphAsString);
  }

  parse(graphAsString) {
    const lines = graphAsString.split(/\r?\n/),
          regexp = /(\d+).*label\s*=\s*"(.+?)"/;
    for (let line of lines) {
      if (line.length > 0 && line.indexOf('->') > -1) {
        let [left, right] = line.split('->'),
            vertex1 = parseInt(left),
            rightMatched = right.match(regexp),
            vertex2 = parseInt(rightMatched[1]),
            label = rightMatched[2];

        this.addEdge(vertex1, vertex2, label);
      }
    }
  }

  addEdge(vertex1, vertex2, label) {
      if (this.outLabels[vertex1] == null) {
          this.outLabels[vertex1] = 0 | (1 << Helper.hash(label));
          this.graphStructure[vertex1] = new Map();
      } else {
          this.outLabels[vertex1] |= (1 << Helper.hash(label));
      }

    //let pushed = false;


    let outForVertex1Labels = this.graphStructure[vertex1].get(vertex2);
    if (outForVertex1Labels == null) {
      this.graphStructure[vertex1].set(vertex2, new Set([label]));
      return true;
    } else if (!outForVertex1Labels.has(label)) {
      outForVertex1Labels.add(label);
      return true;
    }

    return false;
  }
}



class BottomUpSolver {
  static start(rfaGrammarAsString, graphAsString) {
    const rfaGrammar = new RFAGrammar(rfaGrammarAsString);
    const graph = new Graph(graphAsString);
    return this.solve(rfaGrammar, graph);
  }

  static solve(rfaGrammar, graph) {
    const graphStructure = graph.graphStructure,
          rfa = rfaGrammar.rfa;

    let smthChanged = true;
    while (smthChanged) {
      smthChanged = false;

      for (let graphVertex = 0; graphVertex < graphStructure.length; graphVertex++) {
        if (graphStructure[graphVertex] != null) {
          for (let [nonTerminal, rfaVertexes] of rfa.startStates) {
            for (let rfaVertex of rfaVertexes) {
              smthChanged |= this.traverse(rfa, graph, [rfaVertex, graphVertex], nonTerminal);
            }
          }
        }
      }
    }



    const result = [];
    for (let v1 = 0; v1 < graphStructure.length; v1++) {
      if (graphStructure[v1] != null) {
        for (let o of graphStructure[v1]) {
           for (let label of o[1]) {
            if (RFAGrammar.isNonTerminal(label)) {
              result.push(v1 + "," + label + "," + o[0]);
            }
          }
        }
      }
    }

    return result
  }

  static traverse(rfa, graph, startPair, nonTerminal) {
    let smthChanged = false;
    const graphStructure = graph.graphStructure,
        workingPairs = [startPair];

    const milledPairs = new Set([startPair[0] * MAX_VERTEXES + startPair[1]]);


    while (workingPairs.length) {
      let [rfaVertex, graphVertex] = workingPairs.pop(),
          finalNonTerms = rfa.finalStatesToNonTerm.get(rfaVertex);

      if (finalNonTerms != null && finalNonTerms.has(nonTerminal)) {
          smthChanged |= graph.addEdge(startPair[1], graphVertex, nonTerminal);
      }


      if (rfa.outLabels[rfaVertex] & graph.outLabels[graphVertex]) {
        for (let outRfaVertexAndLabels of rfa.graph[rfaVertex]) {
            if (graph.outLabels[graphVertex] & Helper.buildMask(outRfaVertexAndLabels[1])) {
                for (let outGraphVertexAndLabels of graphStructure[graphVertex]) {
                    //intersect

                    if (Helper.hasIntersectionSetAndSet(outRfaVertexAndLabels[1], outGraphVertexAndLabels[1])) {
                        let key = outRfaVertexAndLabels[0] * MAX_VERTEXES + outGraphVertexAndLabels[0];
                        if (!milledPairs.has(key)) {
                            workingPairs.push([outRfaVertexAndLabels[0], outGraphVertexAndLabels[0]]);
                            milledPairs.add(key);
                        }
                    }
                }
            }
        }
      }

    }

    return smthChanged;
  }
}



class IO {
    static readFile(filePath) {
        return fs.readFileSync(filePath, {
            encoding: 'utf8',
            flag: 'r'
        });
    }

    static writeFile(filePath, data) {
        fs.writeFileSync(filePath, data);
    }
}




/*
    LAUNCHING
    NO CHECKS FOR FILE EXISTANCE
*/



let args = process.argv.slice(2),
    grammarFilePath = args[0],
    graphFilePath = args[1],
    outputFilePath = args[2];



for (let i = 1; i < 11; i++) {
    const grammarAsString = IO.readFile(grammarFilePath);
    const graphAsString = IO.readFile(graphFilePath);



    const timeStart = Date.now();

    const result = BottomUpSolver.start(grammarAsString, graphAsString);

    console.log(i, "time spent: ", Date.now() - timeStart, "ms");

    if (outputFilePath) {
        console.log("Saving the result into", outputFilePath);
        IO.writeFile(outputFilePath, result.join(eol));
        console.log("The result was successfuly saved!");
    } else {
        console.log("The result:");
        console.log(result.join(eol));
    }
}

