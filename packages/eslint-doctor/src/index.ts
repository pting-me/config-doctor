#!/usr/bin/env node

import { checkConfig } from './lib/check-config';
checkConfig().catch(console.error);
