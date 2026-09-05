import {
  createPresence,
  type PresenceConnection,
  type PresenceOptions,
} from '@sectile/dom/presence';

const options: PresenceOptions = {
  open: false,
  onPresentChange: (_present) => {},
};
const connection: PresenceConnection = createPresence(options);
const present: boolean = connection.update(true, undefined);

void present;
connection.disconnect();
