import {
  stableIDElementToken,
  stableIDToken,
} from '@sectile/dom/identity';

const metadataToken: string = stableIDToken(1);
const elementToken: string = stableIDElementToken('1');

void metadataToken;
void elementToken;
