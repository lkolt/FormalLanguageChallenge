This is the realization of bottom-up graph analysis using matrix closure.

In code used AVX 2 intrinsics, your processor must support this set of instructions (on Linux you can check it running: "cat /proc/cpuinfo | grep avx2", it should not be empty).

Run build.sh to build this realisation.

First arg of ./challenge is recursive finite automtion, second one is deterministic finite automation.
