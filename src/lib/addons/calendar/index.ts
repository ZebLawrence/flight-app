import type { AddonModule } from '../types';
import { CalendarWidget } from './components/CalendarWidget';

export const calendarAddon: AddonModule = {
  key: 'calendar',
  name: 'Calendar',
  components: {
    CalendarWidget,
  },
};
