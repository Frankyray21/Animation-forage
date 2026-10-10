// DTW à bande (Sakoe-Chiba) entre deux suites de vecteurs float32 de dimension D (A = audio réel, B = synthèse de référence) ;
// écrit, pour chaque trame de B, la première trame de A associée (une ligne par trame). Pas : (1,0), (0,1) poids 1, (1,1) poids 2.
// Compilé et lancé par aligner.py : cc -O2 -o dtw dtw.c -lm ; ./dtw A.f32 B.f32 D bande sortie.txt
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
int main(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "dtw A.f32 B.f32 D bande(fraction) sortie\n"); return 1; }
  int D = atoi(argv[3]); double band = atof(argv[4]);
  FILE *fa = fopen(argv[1], "rb"), *fb = fopen(argv[2], "rb");
  fseek(fa, 0, SEEK_END); long na = ftell(fa) / 4 / D; rewind(fa);
  fseek(fb, 0, SEEK_END); long nb = ftell(fb) / 4 / D; rewind(fb);
  float *A = malloc(na * D * 4), *B = malloc(nb * D * 4);
  if (fread(A, 4, na * D, fa) != (size_t)(na * D) || fread(B, 4, nb * D, fb) != (size_t)(nb * D)) { fprintf(stderr, "lecture incomplète\n"); return 1; }
  long W = (long)(band * (na > nb ? na : nb));
  // pour chaque i de A : j dans [c(i) - W, c(i) + W], c(i) = i * nb / na
  long BW = 2 * W + 1;
  double *prev = malloc(BW * 8), *cur = malloc(BW * 8);
  unsigned char *bp = malloc(na * BW);
  for (long k = 0; k < BW; k++) prev[k] = INFINITY;
  long c0prev = 0;
  for (long i = 0; i < na; i++) {
    long c = i * nb / na, j0 = c - W;
    for (long k = 0; k < BW; k++) {
      long j = j0 + k; cur[k] = INFINITY; bp[i * BW + k] = 3;
      if (j < 0 || j >= nb) continue;
      double d = 0; for (int q = 0; q < D; q++) { double e = A[i * D + q] - B[j * D + q]; d += e * e; } d = sqrt(d);
      if (i == 0 && j == 0) { cur[k] = d; bp[i * BW + k] = 0; continue; }
      double best = INFINITY; int arg = 3;
      if (i > 0) {   // (i-1, j) et (i-1, j-1)
        long pj0 = c0prev - W, kk = j - pj0;
        if (kk >= 0 && kk < BW && prev[kk] + d < best) { best = prev[kk] + d; arg = 1; }
        kk = j - 1 - pj0;
        if (kk >= 0 && kk < BW && prev[kk] + 2 * d < best) { best = prev[kk] + 2 * d; arg = 2; }
      }
      if (k > 0 && cur[k - 1] + d < best) { best = cur[k - 1] + d; arg = 0; }
      cur[k] = best; bp[i * BW + k] = arg;
    }
    double *t = prev; prev = cur; cur = t; c0prev = c;
  }
  // retour depuis (na-1, nb-1)
  long *mapB = malloc(nb * 8); for (long j = 0; j < nb; j++) mapB[j] = -1;
  long i = na - 1, j = nb - 1;
  while (1) {
    long c = i * nb / na, k = j - (c - W);
    if (mapB[j] < 0 || i < mapB[j]) mapB[j] = i;
    int a = bp[i * BW + k];
    if (i == 0 && j == 0) break;
    if (a == 0) j--; else if (a == 1) i--; else if (a == 2) { i--; j--; } else { fprintf(stderr, "chemin rompu à %ld %ld\n", i, j); return 2; }
  }
  FILE *fo = fopen(argv[5], "w");
  for (long q = 0; q < nb; q++) fprintf(fo, "%ld\n", mapB[q]);
  fclose(fo); fprintf(stderr, "na=%ld nb=%ld bande=%ld\n", na, nb, W);
  return 0;
}
