#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
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
9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
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


static const float EDGE_OFFSET_WORLD[12 * 3] = {
	0.5, 0, 0,
	1, 0, 0.5,
	0.5, 0, 1,
	0, 0, 0.5,
	0.5, 1, 0,
	1, 1, 0.5,
	0.5, 1, 1,
	0, 1, 0.5,
	0, 0.5, 0,
	1, 0.5, 0,
	1, 0.5, 1,
	0, 0.5, 1
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

// static unsigned char* counts;
// static char* gradient;


float* marching_cubes(int segId, uint16_t* pixelToSegId) {
	printf("marching_cubes(%d)\n", segId);

	clock_t verybegin, begin, end;

	verybegin = clock();

	double time_spent;

	begin = clock();

	// faster in asm.js
	memset(counts, 0, TOTAL_VOXELS);
	memset(gradient, 0, TOTAL_VOXELS * 3);
	// faster in c
	// counts = (unsigned char*)calloc((TOTAL_VOXELS), sizeof(unsigned char));
	// gradient = (char*)calloc((TOTAL_VOXELS * 3), sizeof(char));

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("memset, time = %fms\n", time_spent);

	int triCount = 0;

	// step 1

	begin = clock();

	const int close = 10;
	const int med = 7;
	const int far = 6;

	for (int i = TOTAL_VOXELS - 1; i >= 0; --i) {
		if (pixelToSegId[i] == segId) {
			counts[i                        ] |= 1;
			counts[i - X_OFF                ] |= 2;
			counts[i         - Y_OFF        ] |= 16;
			counts[i - X_OFF - Y_OFF        ] |= 32;
			counts[i                 - Z_OFF] |= 8;
			counts[i - X_OFF         - Z_OFF] |= 4;
			counts[i         - Y_OFF - Z_OFF] |= 128;
			counts[i - X_OFF - Y_OFF - Z_OFF] |= 64;

			// calculate gradient

			// x
			gradient[(i + X_OFF) * 3] += close;
			gradient[(i - X_OFF) * 3] -= close;

			// y
			gradient[(i + Y_OFF) * 3 + 1] += close;
			gradient[(i - Y_OFF) * 3 + 1] -= close;

			// z
			gradient[(i + Z_OFF) * 3 + 2] += close;
			gradient[(i - Z_OFF) * 3 + 2] -= close;// right down (+ +)

			// right down (+ +)
			gradient[(i + X_OFF + Y_OFF)*3] += med; 
			gradient[(i + X_OFF + Y_OFF)*3+1] += med;

			// right down forward (+ + +)
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3] += far; 
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3+1] += far;
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3+2] += far;

			// right down back (+ + -)
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3] += far; 
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3+1] += far;
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3+2] -= far;

			// left down (- +)
			gradient[(i - X_OFF + Y_OFF)*3] -= med; 
			gradient[(i - X_OFF + Y_OFF)*3+1] += med;

			// left down forward (- + +)
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3] -= far; 
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3+1] += far;
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3+2] += far;

			// left down back (- + -)
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3] -= far; 
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3+1] += far;
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3+2] -= far;

			// left up (- -)
			gradient[(i - X_OFF - Y_OFF)*3] -= med; 
			gradient[(i - X_OFF - Y_OFF)*3+1] -= med;

			// left up forward (- - +)
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3] -= far; 
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3+1] -= far;
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3+2] += far;

			// left up back (- - -)
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3] -= far; 
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3+1] -= far;
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3+2] -= far;

			// right up (+ -)
			gradient[(i + X_OFF - Y_OFF)*3] += med; 
			gradient[(i + X_OFF - Y_OFF)*3+1] -= med;

			// right up forward (+ - +)
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3] += far; 
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3+1] -= far;
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3+2] += far;

			// right up back (+ - -)
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3] += far; 
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3+1] -= far;
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3+2] -= far;

			// right down (+ +)
			gradient[(i + X_OFF + Y_OFF)*3] += med; 
			gradient[(i + X_OFF + Y_OFF)*3+1] += med;

			// right down forward (+ + +)
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3] += far; 
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3+1] += far;
			gradient[(i + X_OFF + Y_OFF + Z_OFF)*3+2] += far;

			// right down back (+ + -)
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3] += far; 
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3+1] += far;
			gradient[(i + X_OFF + Y_OFF - Z_OFF)*3+2] -= far;

			// left down (- +)
			gradient[(i - X_OFF + Y_OFF)*3] -= med; 
			gradient[(i - X_OFF + Y_OFF)*3+1] += med;

			// left down forward (- + +)
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3] -= far; 
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3+1] += far;
			gradient[(i - X_OFF + Y_OFF + Z_OFF)*3+2] += far;

			// left down back (- + -)
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3] -= far; 
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3+1] += far;
			gradient[(i - X_OFF + Y_OFF - Z_OFF)*3+2] -= far;

			// left up (- -)
			gradient[(i - X_OFF - Y_OFF)*3] -= med; 
			gradient[(i - X_OFF - Y_OFF)*3+1] -= med;

			// left up forward (- - +)
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3] -= far; 
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3+1] -= far;
			gradient[(i - X_OFF - Y_OFF + Z_OFF)*3+2] += far;

			// left up back (- - -)
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3] -= far; 
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3+1] -= far;
			gradient[(i - X_OFF - Y_OFF - Z_OFF)*3+2] -= far;

			// right up (+ -)
			gradient[(i + X_OFF - Y_OFF)*3] += med; 
			gradient[(i + X_OFF - Y_OFF)*3+1] -= med;

			// right up forward (+ - +)
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3] += far; 
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3+1] -= far;
			gradient[(i + X_OFF - Y_OFF + Z_OFF)*3+2] += far;

			// right up back (+ - -)
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3] += far; 
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3+1] -= far;
			gradient[(i + X_OFF - Y_OFF - Z_OFF)*3+2] -= far;
		}

		triCount += triCountTable[counts[i]];
	}

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("march, time = %fms\n", time_spent);

	begin = clock();

	// count vertices, allocate memory
	
	int vertexArrCount = triCount * 3 * 3;

	// first element is length of rest of array
	float *meshData;
	meshData = (float*)calloc((1 + vertexArrCount * 2), sizeof(float));

	meshData[0] = vertexArrCount;

	float *meshVertices = meshData + 1;
	float *meshNormals = meshVertices + vertexArrCount;

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("allocate mesh memory, time = %fms\n", time_spent);

	int startIdx = 0;

	float z;
	float x;
	float y;
	float off_x;
	float off_y;
	float off_z;

	uint8_t indvTriCount;
	uint8_t bufferIdx;

	uint8_t m;
	uint8_t v;

	int cubeIndex;

	int vox1;
	int vox2;

	begin = clock();

	for (int i = 0; i < TOTAL_VOXELS; ++i) {
		cubeIndex = counts[i];
		indvTriCount = triCountTable[cubeIndex];
		cubeIndex <<= 4;

		z = floor(i / Z_OFF);
		y = floor((i - z * Z_OFF) / Y_OFF);
		x = i % Y_OFF;

		z += 0.5;
		y += 0.5;
		x += 0.5;

		for (m = 0; m < indvTriCount; ++m) {
			for (v = 0; v < 3; ++v) {
				bufferIdx = triTable[cubeIndex];

				off_x = EDGE_OFFSET_WORLD[bufferIdx * 3];
				off_y = EDGE_OFFSET_WORLD[bufferIdx * 3 + 1];
				off_z = EDGE_OFFSET_WORLD[bufferIdx * 3 + 2];

				meshVertices[startIdx]   = (x + off_x) / X_DIM;
				meshVertices[startIdx+1] = (y + off_y) / Y_DIM;
				meshVertices[startIdx+2] = (z + off_z) / Z_DIM;

				vox1 = (i + EDGE_OFFSET_MEM[bufferIdx * 2]) * 3;
				vox2 = (i + EDGE_OFFSET_MEM[bufferIdx * 2 + 1]) * 3;

				meshNormals[startIdx]   = gradient[vox1]     + gradient[vox2];
				meshNormals[startIdx+1] = gradient[vox1 + 1] + gradient[vox2 + 1];
				meshNormals[startIdx+2] = gradient[vox1 + 2] + gradient[vox2 + 2];
				cubeIndex++;
				startIdx += 3;
			}
		}
	}

	// free(counts);
	// free(gradient);

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("triangulate, time = %fms\n", time_spent);

	time_spent = (double)(end - verybegin) * 1000 / CLOCKS_PER_SEC;

	printf("total, time = %fms, tris = %d\n", time_spent, triCount);

	return meshData;
}

float* marching_cubes_wireframe(int segId, uint16_t* pixelToSegId) {
	printf("wireframe marching_cubes(%d)\n", segId);

	clock_t verybegin, begin, end;

	verybegin = clock();

	double time_spent;

	begin = clock();

	// faster in asm.js
	// memset(counts, 0, TOTAL_VOXELS);
	// faster in c
	// counts = (unsigned char*)calloc((TOTAL_VOXELS), sizeof(unsigned char));

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("wireframe memset, time = %fms\n", time_spent);

	int triCount = 0;

	// step 1

	begin = clock();

	for (int i = TOTAL_VOXELS - 1; i >= 0; --i) {
		if (pixelToSegId[i] == segId) {
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
	}

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("wireframe march, time = %fms\n", time_spent);

	begin = clock();

	// count vertices, allocate memory
	
	int vertexArrCount = triCount * 3 * 3;

	// first element is length of rest of array
	float *meshData;
	meshData = (float*)calloc((1 + vertexArrCount), sizeof(float));

	meshData[0] = vertexArrCount;

	float *meshVertices = meshData + 1;

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("wireframe allocate mesh memory, time = %fms\n", time_spent);

	int startIdx = 0;

	float z;
	float x;
	float y;
	float off_x;
	float off_y;
	float off_z;

	uint8_t indvTriCount;
	uint8_t bufferIdx;

	uint8_t m;
	uint8_t v;

	int cubeIndex;

	int vox1;
	int vox2;

	begin = clock();

	for (int i = 0; i < TOTAL_VOXELS; ++i) {
		cubeIndex = counts[i];
		counts[i] = 0;
		indvTriCount = triCountTable[cubeIndex];
		cubeIndex <<= 4;

		z = floor(i / Z_OFF);
		y = floor((i - z * Z_OFF) / Y_OFF);
		x = i % Y_OFF;

		z += 0.5;
		y += 0.5;
		x += 0.5;

		for (m = 0; m < indvTriCount; ++m) {
			for (v = 0; v < 3; ++v) {
				bufferIdx = triTable[cubeIndex];

				off_x = EDGE_OFFSET_WORLD[bufferIdx * 3];
				off_y = EDGE_OFFSET_WORLD[bufferIdx * 3 + 1];
				off_z = EDGE_OFFSET_WORLD[bufferIdx * 3 + 2];

				meshVertices[startIdx]   = (x + off_x) / X_DIM;
				meshVertices[startIdx+1] = (y + off_y) / Y_DIM;
				meshVertices[startIdx+2] = (z + off_z) / Z_DIM;
				cubeIndex++;
				startIdx += 3;
			}
		}
	}

	end = clock();

	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

	printf("wireframe triangulate, time = %fms\n", time_spent);

	time_spent = (double)(end - verybegin) * 1000 / CLOCKS_PER_SEC;

	printf("wireframe total, time = %fms, tris = %d\n", time_spent, triCount);

	return meshData;
}

}

// int main() {
// 	clock_t begin, end;
// 	double time_spent;

// 	unsigned short* pixelToSegId;
// 	pixelToSegId = (unsigned short*)malloc(TOTAL_VOXELS * sizeof(unsigned short));

// 	FILE *filePtr = fopen("segmentation", "rb");

// 	fread(pixelToSegId, 256 * 256 * 256, 2, filePtr);

// 	fclose(filePtr);

// 	printf("hello, world! %lu - %d\n", sizeof(unsigned short), pixelToSegId[128 + 128 * 256 + 128 * (256 * 256)]);

// 	begin = clock();
// 	float* meshPtr = marching_cubes(2923, pixelToSegId);
// 	end = clock();

// 	time_spent = (double)(end - begin) * 1000 / CLOCKS_PER_SEC;

// 	printf("Mesh PTR = %lu, time = %fms\n", (uintptr_t)meshPtr, time_spent);

// 	free(meshPtr);
// 	free(pixelToSegId);
// 	return 0;
// }
