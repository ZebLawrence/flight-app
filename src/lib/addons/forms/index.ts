import type { AddonModule } from '../types';
import { FormBuilder } from './components/FormBuilder';

export const formsAddon: AddonModule = {
  key: 'forms',
  name: 'Forms',
  components: {
    FormBuilder,
  },
};
