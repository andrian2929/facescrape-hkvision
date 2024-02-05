import { Command } from 'commander';
import fs from 'fs';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const program = new Command();

const DEFAULT_ITEM_PER_PAGE = 100;
const DEFAULT_MAX_AUTH_RETRY = 3;
const DEFAULT_MAX_CONNECT_RETRY = 3;

program
  .description('An example CLI program')
  .requiredOption('--config <config_file_path>', 'Path to the yaml config file')
  .requiredOption('--start <start_date>', 'Start date for the face scraping')
  .requiredOption(
    '--period <period>',
    'Period for the face scraping in seconds'
  );

program.parse();
const options = program.opts();

const config = readConfig(options.config);

const { startTime, endTime } = getTimePeriod(
  new Date(options.start),
  parseInt(options.period, 10)
);

for (const device of config.device) {
  scrapeDevice(
    device,
    startTime,
    endTime,
    config.storage_directory,
    config.fingerprint_page,
    config.not_found_image
  );
}

function getPostRequestPayload(
  searchId: string,
  perPage: number,
  searchPosition: number,
  startTime: string,
  endTime: string
) {
  return {
    AcsEventCond: {
      searchId: searchId,
      maxResults: perPage,
      searchResultPosition: searchPosition,
      major: 0,
      minor: 0,
      startTime: startTime,
      endTime: endTime,
    },
  };
}

async function scrapeDevice(
  device: any,
  startTime: string,
  endTime: string,
  storageDirectory: string,
  fingerPrintPage: string,
  notFoundImage: string
) {
  const path = '/ISAPI/AccessControl/AcsEvent?format=json';
  const url = device.url.endsWith('/')
    ? device.url.slice(0, -1) + path
    : device.url + path;

  let perPage = DEFAULT_ITEM_PER_PAGE;
  let searchPosition = 0;
  let resetSessionRequired = true;
  let maxAuthRetry = DEFAULT_MAX_AUTH_RETRY;
  let authRetryCount = 0;
  let maxConnectRetry = DEFAULT_MAX_CONNECT_RETRY;
  let connectRetryCount = 1;

  while (true) {
    const searchId = uuidv4();
    const requestPayload = getPostRequestPayload(
      searchId,
      perPage,
      searchPosition,
      startTime,
      endTime
    );

    if (resetSessionRequired) {
      const session = axios.create({
        auth: {
          username: device.username,
          password: device.password,
        },
      });
      resetSessionRequired = false;
      authRetryCount += 1;

      try {
        const eventResponse = await session.post(url, requestPayload);
        console.log(eventResponse.data);
        break;
      } catch (error: any) {
        console.log(error.message);
      }
    }
  }
}

function readConfig(configPath: string): any {
  const configFile = fs.readFileSync(configPath, 'utf8');
  return yaml.load(configFile);
}

function getTimePeriod(start: Date, period: number) {
  const end = new Date(start.getTime() + period * 1000);
  return {
    startTime: start.toISOString().slice(0, -1) + config.timezone_offset,
    endTime: end.toISOString().slice(0, -1) + config.timezone_offset,
  };
}
