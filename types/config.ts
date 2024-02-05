type Device = {
  name: string;
  url: string;
  username: string;
  password: string;
};

export type Config = {
  storageDirectory: string;
  fingerPrintPage: string;
  notFoundImage: string;
  timeZoneOffset: string;
  period: number;
  timeZone: string;
  device: Device[];
};
