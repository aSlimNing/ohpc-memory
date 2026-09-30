#include <stdlib.h>
#include <stdio.h>
int main(){char*p=malloc(8);p[12]=1;printf("v=%d\n",p[12]);return 0;}
