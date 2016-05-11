#include <stdlib.h>
#include <math.h>
#include <cmath>
#include <string.h>
#include <stdio.h>
// #include <time.h>
#include <stdint.h>

extern "C" {

static const int X_DIM = 256;
static const int Y_DIM = 256;
static const int Z_DIM = 256;

static const int X_OFF = 1;
static const int Y_OFF = X_DIM;
static const int Z_OFF = X_DIM * Y_DIM;

static const int TOTAL_VOXELS = X_DIM * Y_DIM * Z_DIM;


static const int triCountTable[256] = {
  0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 2, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4,
  3, 4, 4, 3, 2, 3, 3, 2, 3, 4, 4, 3, 3, 4, 4, 3, 4, 5, 5, 2, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 2, 3, 3, 4, 3, 4, 4, 5,
  3, 4, 4, 5, 4, 5, 5, 4, 2, 3, 3, 4, 3, 4, 2, 3, 3, 4, 4, 5, 4, 5, 3, 2, 3, 4, 4, 3, 4, 5, 3, 2, 4, 5, 5, 4, 5, 2, 4, 1, 1, 2, 2, 3,
  2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 2, 3, 3, 4, 3, 4, 4, 5, 3, 2, 4, 3, 4, 3, 5, 2, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 4,
  3, 4, 4, 3, 4, 5, 5, 4, 4, 3, 5, 2, 5, 4, 2, 1, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 2, 3, 3, 2, 3, 4, 4, 5, 4, 5, 5, 2, 4, 3, 5, 4,
  3, 2, 4, 1, 3, 4, 4, 5, 4, 5, 3, 4, 4, 5, 5, 2, 3, 4, 2, 1, 2, 3, 3, 2, 3, 4, 2, 1, 3, 2, 4, 1, 2, 1, 1, 0};


static const int triTable[256*16] = {
- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 8, 3, 9, 8, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 2, 10, 0, 2, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 8, 3, 2, 10, 8, 10, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 11, 2, 8, 11, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 11, 2, 1, 9, 11, 9, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 10, 1, 11, 10, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 10, 1, 0, 8, 10, 8, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 9, 0, 3, 11, 9, 11, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, // this is flat across
4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 3, 0, 7, 3, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 1, 9, 4, 7, 1, 7, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 4, 7, 3, 0, 4, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 2, 10, 9, 0, 2, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
8, 4, 7, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 4, 7, 11, 2, 4, 2, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 1, 8, 4, 7, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, - 1, - 1, - 1, - 1,
3, 10, 1, 3, 11, 10, 7, 8, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, - 1, - 1, - 1, - 1,
4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
4, 7, 11, 4, 11, 9, 9, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 5, 4, 1, 5, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 5, 4, 8, 3, 5, 3, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 1, 2, 10, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 2, 10, 5, 4, 2, 4, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, - 1, - 1, - 1, - 1,
9, 5, 4, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 11, 2, 0, 8, 11, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 5, 4, 0, 1, 5, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, - 1, - 1, - 1, - 1,
10, 3, 11, 10, 1, 3, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, - 1, - 1, - 1, - 1,
5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
5, 4, 8, 5, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 7, 8, 5, 7, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 3, 0, 9, 5, 3, 5, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 7, 8, 0, 1, 7, 1, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 7, 8, 9, 5, 7, 10, 1, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, - 1, - 1, - 1, - 1,
8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, - 1, - 1, - 1, - 1,
2, 10, 5, 2, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 9, 5, 7, 8, 9, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, - 1, - 1, - 1, - 1,
11, 2, 1, 11, 1, 7, 7, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, - 1, - 1, - 1, - 1,
5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, - 1,
11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, - 1,
11, 10, 5, 7, 11, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 1, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 8, 3, 1, 9, 8, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 5, 2, 6, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 5, 1, 2, 6, 3, 0, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 6, 5, 9, 0, 6, 0, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, - 1, - 1, - 1, - 1,
2, 3, 11, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 0, 8, 11, 2, 0, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, - 1, - 1, - 1, - 1,
6, 3, 11, 6, 5, 3, 5, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, - 1, - 1, - 1, - 1,
6, 5, 9, 6, 9, 11, 11, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 3, 0, 4, 7, 3, 6, 5, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 5, 10, 6, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
6, 1, 2, 6, 5, 1, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, - 1, - 1, - 1, - 1,
8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, - 1, - 1, - 1, - 1,
7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, - 1,
3, 11, 2, 7, 8, 4, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1,
9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, - 1,
8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, - 1,
0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, - 1,
6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, - 1, - 1, - 1, - 1,
10, 4, 9, 6, 4, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 10, 6, 4, 9, 10, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 0, 1, 10, 6, 0, 6, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
1, 4, 9, 1, 2, 4, 2, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, - 1, - 1, - 1, - 1,
0, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 3, 2, 8, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 4, 9, 10, 6, 4, 11, 2, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, - 1, - 1, - 1, - 1,
3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, - 1,
9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, - 1, - 1, - 1, - 1,
8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, - 1,
3, 11, 6, 3, 6, 0, 0, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 4, 8, 11, 6, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 10, 6, 7, 8, 10, 8, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, - 1, - 1, - 1, - 1,
10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, - 1, - 1, - 1, - 1,
10, 6, 7, 10, 7, 1, 1, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, - 1,
7, 8, 0, 7, 0, 6, 6, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 3, 2, 6, 7, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, - 1,
1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, - 1,
11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, - 1, - 1, - 1, - 1,
8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, - 1,
0, 9, 1, 11, 6, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, - 1, - 1, - 1, - 1,
7, 11, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 1, 9, 8, 3, 1, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 1, 2, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 3, 0, 8, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 9, 0, 2, 10, 9, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, - 1, - 1, - 1, - 1,
7, 2, 3, 6, 2, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 0, 8, 7, 6, 0, 6, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 7, 6, 2, 3, 7, 0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, - 1, - 1, - 1, - 1,
10, 7, 6, 10, 1, 7, 1, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, - 1, - 1, - 1, - 1,
0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, - 1, - 1, - 1, - 1,
7, 6, 10, 7, 10, 8, 8, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 8, 4, 11, 8, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 6, 11, 3, 0, 6, 0, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 6, 11, 8, 4, 6, 9, 0, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, - 1, - 1, - 1, - 1,
6, 8, 4, 6, 11, 8, 2, 10, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, - 1, - 1, - 1, - 1,
4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, - 1, - 1, - 1, - 1,
10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, - 1,
8, 2, 3, 8, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, - 1, - 1, - 1, - 1,
1, 9, 4, 1, 4, 2, 2, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, - 1, - 1, - 1, - 1,
10, 1, 0, 10, 0, 6, 6, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, - 1,
10, 9, 4, 6, 10, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 5, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 4, 9, 5, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 0, 1, 5, 4, 0, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, - 1, - 1, - 1, - 1,
9, 5, 4, 10, 1, 2, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, - 1, - 1, - 1, - 1,
7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, - 1, - 1, - 1, - 1,
3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, - 1,
7, 2, 3, 7, 6, 2, 5, 4, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, - 1, - 1, - 1, - 1,
3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, - 1, - 1, - 1, - 1,
6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, - 1,
9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, - 1, - 1, - 1, - 1,
1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, - 1,
4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, - 1,
7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, - 1, - 1, - 1, - 1,
6, 9, 5, 6, 11, 9, 11, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, - 1, - 1, - 1, - 1,
0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, - 1, - 1, - 1, - 1,
6, 11, 3, 6, 3, 5, 5, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, - 1, - 1, - 1, - 1,
0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, - 1,
11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, - 1,
6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, - 1, - 1, - 1, - 1,
5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, - 1, - 1, - 1, - 1,
9, 5, 6, 9, 6, 0, 0, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, - 1,
1, 5, 6, 2, 1, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, - 1,
10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, - 1, - 1, - 1, - 1,
0, 3, 8, 5, 6, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 5, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 5, 10, 7, 5, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 5, 10, 11, 7, 5, 8, 3, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 11, 7, 5, 10, 11, 1, 9, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, - 1, - 1, - 1, - 1,
11, 1, 2, 11, 7, 1, 7, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, - 1, - 1, - 1, - 1,
9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, - 1, - 1, - 1, - 1,
7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, - 1,
2, 5, 10, 2, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, - 1, - 1, - 1, - 1,
9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, - 1, - 1, - 1, - 1,
9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, - 1,
1, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 7, 0, 7, 1, 1, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 3, 9, 3, 5, 5, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 8, 7, 5, 9, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 8, 4, 5, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, - 1, - 1, - 1, - 1,
0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, - 1, - 1, - 1, - 1,
10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, - 1,
2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, - 1, - 1, - 1, - 1,
0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, - 1,
0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, - 1,
9, 4, 5, 2, 11, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, - 1, - 1, - 1, - 1,
5, 10, 2, 5, 2, 4, 4, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, - 1,
5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, - 1, - 1, - 1, - 1,
8, 4, 5, 8, 5, 3, 3, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 4, 5, 1, 0, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, - 1, - 1, - 1, - 1,
9, 4, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 11, 7, 4, 9, 11, 9, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, - 1, - 1, - 1, - 1,
1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, - 1, - 1, - 1, - 1,
3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, - 1,
4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, - 1, - 1, - 1, - 1,
9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, - 1,
11, 7, 4, 11, 4, 2, 2, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, - 1, - 1, - 1, - 1,
2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, - 1, - 1, - 1, - 1,
9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, - 1,
3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, - 1,
1, 10, 2, 8, 7, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 1, 4, 1, 7, 7, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, - 1, - 1, - 1, - 1,
4, 0, 3, 7, 4, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 8, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 9, 3, 9, 11, 11, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 10, 0, 10, 8, 8, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 1, 10, 11, 3, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 11, 1, 11, 9, 9, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, - 1, - 1, - 1, - 1,
0, 2, 11, 8, 0, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 2, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 8, 2, 8, 10, 10, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 10, 2, 0, 9, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, - 1, - 1, - 1, - 1,
1, 10, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 3, 8, 9, 1, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 9, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 3, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1};

// why do I add 0.5?
static const float EDGE_OFFSET_WORLD[12 * 3] = {
	1.0, 0.5, 0.5,
	1.5, 0.5, 1.0,
	1.0, 0.5, 1.5,
	0.5, 0.5, 1.0,
	1.0, 1.5, 0.5,
	1.5, 1.5, 1.0,
	1.0, 1.5, 1.5,
	0.5, 1.5, 1.0,
	0.5, 1.0, 0.5,
	1.5, 1.0, 0.5,
	1.5, 1.0, 1.5,
	0.5, 1.0, 1.5
};

static const int VO[8] = {
	0,
	X_OFF,
	X_OFF + Z_OFF,
	Z_OFF,
	Y_OFF,
	X_OFF + Y_OFF,
	X_OFF + Z_OFF + Y_OFF,
	Z_OFF + Y_OFF
};

static const int EDGE_OFFSET_MEM[12 * 2] = {
	VO[0], VO[1],
	VO[1], VO[2],
	VO[2], VO[3],
	VO[3], VO[0],
	VO[4], VO[5],
	VO[5], VO[6],
	VO[6], VO[7],
	VO[7], VO[4],
	VO[0], VO[4],
	VO[1], VO[5],
	VO[2], VO[6],
	VO[3], VO[7]
};

static uint8_t counts[TOTAL_VOXELS];
static int8_t gradient[TOTAL_VOXELS * 3];
static float blur[TOTAL_VOXELS];

// static unsigned char* counts;
// static char* gradient;


float* marching_cubes(uint16_t* pixelToSegId, int segId, int startX, int startY, int startZ, int endX, int endY, int endZ) {
	int triCount = 0;

	printf("hi %d\n", segId);

	// step 1
	const int close = 10;
	const int med = 7;
	const int far = 6;

	int x, y, z;

	int X_WIN_SIZE = endX - startX + 1;
	int Y_WIN_SIZE = endY - startY + 1;

	int i = endX + endY * X_DIM + endZ * X_DIM * Y_DIM;


	printf("we are here %d\n", segId);

	const float FALLOFF = sqrt(4);

	printf("first sqrt %.4f\n", FALLOFF);

	const float dist0 = 1;
	const float dist1 = 1 - sqrt(1) / FALLOFF;
	const float dist2 = 1 - sqrt(2) / FALLOFF;
	const float dist3 = 1 - sqrt(3) / FALLOFF;

	printf("finished distances %.4f %.4f %.4f %.4f\n", dist0, dist1, dist2, dist3);

	const float BLUR_SUM = dist0 + dist1 * 6 + dist2 * 12 + dist3 * 8;

	printf("blurring %d pixels\n", X_WIN_SIZE * Y_WIN_SIZE * (endZ - startZ + 1));

	for (z = endZ; z >= startZ; --z) {
		for (y = endY; y >= startY; --y) {
			for (x = endX; x >= startX; --x) {
				if (pixelToSegId[i] == segId) {
					blur[i] += dist0;
					blur[i - X_OFF] += dist1;
					blur[i + X_OFF] += dist1;
					blur[i - Y_OFF] += dist1;
					blur[i + Y_OFF] += dist1;
					blur[i - Z_OFF] += dist1;
					blur[i + Z_OFF] += dist1;
					blur[i - X_OFF - Y_OFF] += dist2;
					blur[i + X_OFF - Y_OFF] += dist2;
					blur[i - X_OFF + Y_OFF] += dist2;
					blur[i + X_OFF + Y_OFF] += dist2;
					blur[i - X_OFF - Z_OFF] += dist2;
					blur[i + X_OFF - Z_OFF] += dist2;
					blur[i - X_OFF + Z_OFF] += dist2;
					blur[i + X_OFF + Z_OFF] += dist2;
					blur[i - Y_OFF - Z_OFF] += dist2;
					blur[i + Y_OFF - Z_OFF] += dist2;
					blur[i - Y_OFF + Z_OFF] += dist2;
					blur[i + Y_OFF + Z_OFF] += dist2;
					blur[i - X_OFF - Y_OFF - Z_OFF] += dist3;
					blur[i + X_OFF - Y_OFF - Z_OFF] += dist3;
					blur[i - X_OFF + Y_OFF - Z_OFF] += dist3;
					blur[i + X_OFF + Y_OFF - Z_OFF] += dist3;
					blur[i - X_OFF - Y_OFF + Z_OFF] += dist3;
					blur[i + X_OFF - Y_OFF + Z_OFF] += dist3;
					blur[i - X_OFF + Y_OFF + Z_OFF] += dist3;
					blur[i + X_OFF + Y_OFF + Z_OFF] += dist3;
				}
				--i;
			}
			i = i + X_WIN_SIZE - Y_OFF;
		}
		i = i + Y_WIN_SIZE * Y_OFF - Z_OFF;
		printf("i %d\n", i);
	}

	// need to move search window out because isosurface may haved moved as a result of blurring

	// move start by two since marching overshoots
	startX -= 2;
	startY -= 2;
	startZ -= 2;

	endX++;
	endY++;
	endZ++;

	X_WIN_SIZE = endX - startX + 1;
	Y_WIN_SIZE = endY - startY + 1;

	printf("hi2 %d\n", segId);

	i = endX + endY * X_DIM + endZ * X_DIM * Y_DIM;

	for (z = endZ; z >= startZ; --z) {
		for (y = endY; y >= startY; --y) {
			for (x = endX; x >= startX; --x) {
				blur[i] /= BLUR_SUM;
				if (blur[i] > 0.5) {
					counts[i                        ] |= 1;
					counts[i - X_OFF                ] |= 2;
					counts[i         - Y_OFF        ] |= 16;
					counts[i - X_OFF - Y_OFF        ] |= 32;
					counts[i                 - Z_OFF] |= 8;
					counts[i - X_OFF         - Z_OFF] |= 4;
					counts[i         - Y_OFF - Z_OFF] |= 128;
					counts[i - X_OFF - Y_OFF - Z_OFF] |= 64;
				}
				triCount += triCountTable[counts[i]];

				--i;
			}
			i = i + X_WIN_SIZE - Y_OFF;
		}
		i = i + Y_WIN_SIZE * Y_OFF - Z_OFF;
	}

	// count vertices, allocate memory
	int vertexCount = triCount * 3;

	printf("triCount %d\n", triCount);

	// first element is length of rest of array
	float *meshData;
	meshData = (float*)calloc((1 + vertexCount * 3 * 2), sizeof(float));

	meshData[0] = vertexCount;

	float *meshVertices = meshData + 1;
	// float *meshNormals = meshVertices + vertexArrCount;

	printf("hi3 %d\n", segId);

	int startIdx = 0;

	uint8_t indvTriCount;
	uint8_t bufferIdx;

	uint8_t m;
	uint8_t v;

	int cubeIndex;

	int vox1, vox2;

	float t;
	float p1;
	float p2;
	int temp;
	float tempF;

	int xt, yt, zt;

	// int finalTriCount = 0;

	i = startX + startY * X_DIM + startZ * X_DIM * Y_DIM;

	for (z = startZ; z <= endZ; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = startX; x <= endX; ++x) {
				cubeIndex = counts[i];
				counts[i] = 0;
				indvTriCount = triCountTable[cubeIndex];
				cubeIndex <<= 4;

				for (m = 0; m < indvTriCount; ++m) {
					for (v = 0; v < 3; ++v) {
						bufferIdx = triTable[cubeIndex];

						vox1 = (i + EDGE_OFFSET_MEM[bufferIdx * 2]) * 1;
						vox2 = (i + EDGE_OFFSET_MEM[bufferIdx * 2 + 1]) * 1;

						p1 = blur[vox1];
						p2 = blur[vox2];

						if (p2 < p1) {
							temp = vox2;
							vox2 = vox1;
							vox1 = temp;

							tempF = p2;
							p2 = p1;
							p1 = tempF;
						}

						t = (0.5 - p1) / (p2 - p1);

						zt = floor(vox1 / Z_OFF);
						yt = floor((vox1 - zt * Z_OFF) / Y_OFF);
						xt = vox1 % Y_OFF;

						meshVertices[startIdx]   += xt * (1.0 - t) / X_DIM;
						meshVertices[startIdx+1] += yt * (1.0 - t) / Y_DIM;
						meshVertices[startIdx+2] += zt * (1.0 - t) / Z_DIM;

						zt = floor(vox2 / Z_OFF);
						yt = floor((vox2 - zt * Z_OFF) / Y_OFF);
						xt = vox2 % Y_OFF;

						meshVertices[startIdx]   += xt * t / X_DIM;
						meshVertices[startIdx+1] += yt * t / Y_DIM;
						meshVertices[startIdx+2] += zt * t / Z_DIM;

						// meshNormals[startIdx]   = gradient[vox1 * 3]     * (1.0 - t) + gradient[vox2 * 3]     * t;
						// meshNormals[startIdx+1] = gradient[vox1 * 3 + 1] * (1.0 - t) + gradient[vox2 * 3 + 1] * t;
						// meshNormals[startIdx+2] = gradient[vox1 * 3 + 2] * (1.0 - t) + gradient[vox2 * 3 + 2] * t;
						cubeIndex++;
						startIdx += 3;
					}

					// finalTriCount++;
				}

				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	printf("hi4 %d\n", segId);

	// TODO, just added this, needs thought
	// startX--;
	// startY--;
	// startZ--;

	// endX++;
	// endY++;
	// endZ++;

	// X_WIN_SIZE = endX - startX + 1;
	// Y_WIN_SIZE = endY - startY + 1;


	i = startX + startY * X_DIM + startZ * X_DIM * Y_DIM;

	// clean up counts and gradient
	int gIdx;
	for (z = startZ; z <= endZ; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = startX; x <= endX; ++x) {
				counts[i] = 0;
				blur[i] = 0;
				gIdx = i * 3;
				// gradient[gIdx] = 0;
				// gradient[gIdx+1] = 0;
				// gradient[gIdx+2] = 0;

				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	printf("hi5 %d\n", segId);

	// sort points

	// create index/allocate new memory, free old


	return meshData;
}











static uint8_t wf_counts[TOTAL_VOXELS];

float* marching_cubes_wireframe(int segId, int originX, int originY, int originZ, const int PREVIEW_SIZE, uint16_t* pixelToSegId) {
	// printf("wireframe marching_cubes(%d)\n", segId);

	// clock_t verybegin, begin, end;

	// verybegin = clock();

	// double time_spent;

	int triCount = 0;

	int x, y, z;
	
	int startX = originX - PREVIEW_SIZE / 2;
	int endX = startX + PREVIEW_SIZE - 1;
	int startY = originY - PREVIEW_SIZE / 2;
	int endY = startY + PREVIEW_SIZE - 1;
	int startZ = originZ - PREVIEW_SIZE / 2;
	int endZ = startZ + PREVIEW_SIZE - 1;

	startX = fmax(1, startX);
	startY = fmax(1, startY);
	startZ = fmax(1, startZ);

	endX = fmin(X_DIM - 2, endX);
	endY = fmin(Y_DIM - 2, endY);
	endZ = fmin(Z_DIM - 2, endZ);

	int X_WIN_SIZE = endX - startX + 1;
	int Y_WIN_SIZE = endY - startY + 1;

	int i = endX + endY * X_DIM + endZ * X_DIM * Y_DIM;

	int triCount2 = 0;

	// step 1

	// begin = clock();

	int checkCount1 = 0;

	// printf("x %d %d y %d %d z %d %d\n", startX, endX, startY, endY, startZ, endZ);

	// TODO, this probably fails to reset the memory at startZ -1, startY -1, startX - 1

	for (z = endZ; z >= startZ; --z) {
		for (y = endY; y >= startY; --y) {
			for (x = endX; x >= startX; --x) {
				checkCount1++;
				if (pixelToSegId[i] == segId) {
					// printf("march: %d %d %d\n", x, y, z);
					wf_counts[i                        ] |= 1;
					wf_counts[i - X_OFF                ] |= 2;
					wf_counts[i         - Y_OFF        ] |= 16;
					wf_counts[i - X_OFF - Y_OFF        ] |= 32;
					wf_counts[i                 - Z_OFF] |= 8;
					wf_counts[i - X_OFF         - Z_OFF] |= 4;
					wf_counts[i         - Y_OFF - Z_OFF] |= 128;
					wf_counts[i - X_OFF - Y_OFF - Z_OFF] |= 64;
				}
				triCount += triCountTable[wf_counts[i]];

				--i;
			}
			i = i + X_WIN_SIZE - Y_OFF;
		}
		i = i + Y_WIN_SIZE * Y_OFF - Z_OFF;
	}

	int si = startZ - 1;
	i = startX + startY * X_DIM + si * X_DIM * Y_DIM;
	for (z = si; z <= si; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = startX; x <= endX; ++x) {
				wf_counts[i] = 0;
				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	si = endZ;
	i = startX + startY * X_DIM + si * X_DIM * Y_DIM;
	for (z = si; z <= si; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = startX; x <= endX; ++x) {
				triCount -= triCountTable[wf_counts[i]];
				wf_counts[i] = 0;
				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	si = startY - 1;
	i = startX + si * X_DIM + startZ * X_DIM * Y_DIM;
	for (z = startZ; z <= endZ; ++z) {
		for (y = si; y <= si; ++y) {
			for (x = startX; x <= endX; ++x) {
				wf_counts[i] = 0;
				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - 1 * Y_OFF + Z_OFF;
	}

	si = endY;
	i = startX + si * X_DIM + startZ * X_DIM * Y_DIM;
	for (z = startZ; z <= endZ; ++z) {
		for (y = si; y <= si; ++y) {
			for (x = startX; x <= endX; ++x) {
				triCount -= triCountTable[wf_counts[i]];
				wf_counts[i] = 0;
				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - 1 * Y_OFF + Z_OFF;
	}

	si = startX - 1;
	i = si + startY * X_DIM + startZ * X_DIM * Y_DIM;
	for (z = startZ; z <= endZ; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = si; x <= si; ++x) {
				wf_counts[i] = 0;
				++i;
			}
			i = i - 1 + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	si = endX;
	i = si + startY * X_DIM + startZ * X_DIM * Y_DIM;
	for (z = startZ; z <= endZ; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = si; x <= si; ++x) {
				triCount -= triCountTable[wf_counts[i]];
				wf_counts[i] = 0;
				++i;
			}
			i = i - 1 + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	// end = clock();

	// time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	// printf("wireframe march, time = %fms\n", time_spent);

	// begin = clock();

	// count vertices, allocate memory
	
	int vertexArrCount = triCount * 3 * 3;

	// first element is length of rest of array
	float *meshData;
	meshData = (float*)calloc((1 + vertexArrCount), sizeof(float));

	meshData[0] = vertexArrCount;

	float *meshVertices = meshData + 1;

	// end = clock();

	// time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	// printf("wireframe allocate mesh memory, time = %fms\n", time_spent);

	int startIdx = 0;

	float off_x, off_y, off_z;

	uint8_t indvTriCount;
	uint8_t bufferIdx;

	uint8_t m;
	uint8_t v;

	int cubeIndex;

	int vox1, vox2;

	// begin = clock();

	i = startX + startY * X_DIM + startZ * X_DIM * Y_DIM;

	// why do I decrement end instead of incrementing start? because we start and the end and we bit flip past the end
	endZ--;
	endY--;
	endX--;

	X_WIN_SIZE--;
	Y_WIN_SIZE--;

	int checkCount2 = 0;

	int triCountTake2 = 0;

	printf("x %d %d y %d %d z %d %d\n", startX, endX, startY, endY, startZ, endZ);

	for (z = startZ; z <= endZ; ++z) {
		for (y = startY; y <= endY; ++y) {
			for (x = startX; x <= endX; ++x) {
				cubeIndex = wf_counts[i];
				wf_counts[i] = 0;
				indvTriCount = triCountTable[cubeIndex];
				cubeIndex <<= 4;

				// printf("check: %d %d %d  count %d\n", x, y, z, indvTriCount);

				for (m = 0; m < indvTriCount; ++m) {
					for (v = 0; v < 3; ++v) {
						bufferIdx = triTable[cubeIndex];

						off_x = EDGE_OFFSET_WORLD[bufferIdx * 3];
						off_y = EDGE_OFFSET_WORLD[bufferIdx * 3 + 1];
						off_z = EDGE_OFFSET_WORLD[bufferIdx * 3 + 2];

						meshVertices[startIdx]   = (off_x + x) / X_DIM;
						meshVertices[startIdx+1] = (off_y + y) / Y_DIM;
						meshVertices[startIdx+2] = (off_z + z) / Z_DIM;

						cubeIndex++;
						startIdx += 3;
					}
				}

				++i;
			}
			i = i - X_WIN_SIZE + Y_OFF;
		}
		i = i - Y_WIN_SIZE * Y_OFF + Z_OFF;
	}

	// end = clock();

	// time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	// printf("wireframe triangulate, time = %fms\n", time_spent);

	// time_spent = (double)(end - verybegin) * 1000 / CLOCKS_PER_SEC;

	// printf("wireframe total, time = %fms, tris = %d\n", time_spent, triCount);

	// printf("checkCount %d/%d\n", checkCount1, checkCount2);

	return meshData;
}

}