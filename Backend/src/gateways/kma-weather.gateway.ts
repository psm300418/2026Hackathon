import { env } from "../config/env.js";
import type { WeatherObservation } from "../types/weather.js";

const KOREA_TIME_OFFSET_HOURS = 9;
const MINUTES_PER_HOUR = 60;
const WEATHER_LOOKUP_OFFSETS_MINUTES = [0, -60, 60, -120, 120, -180, 180];

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

const toKmaTime = (date: Date): string => {
  const koreaDate = new Date(date.getTime() + KOREA_TIME_OFFSET_HOURS * 60 * 60 * 1000);
  return [
    koreaDate.getUTCFullYear(),
    pad(koreaDate.getUTCMonth() + 1),
    pad(koreaDate.getUTCDate()),
    pad(koreaDate.getUTCHours()),
    pad(koreaDate.getUTCMinutes())
  ].join("");
};

const parseKmaTimeToIso = (value: string): string => {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const utcMillis = Date.UTC(year, month - 1, day, hour - KOREA_TIME_OFFSET_HOURS, minute);
  return new Date(utcMillis).toISOString();
};

const roundToNearestHour = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  rounded.setSeconds(0, 0);
  rounded.setMinutes(minutes >= 30 ? MINUTES_PER_HOUR : 0);
  return rounded;
};

const candidateObservationTimes = (baseDate: Date): Date[] => {
  const rounded = roundToNearestHour(baseDate);
  return WEATHER_LOOKUP_OFFSETS_MINUTES.map((offsetMinutes) =>
    new Date(rounded.getTime() + offsetMinutes * 60 * 1000)
  );
};

const parseNumber = (value: string | undefined): number | null => {
  if (!value || value === "-9" || value === "-99" || value === "-999") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeHeaderName = (value: string) => value.replace(/^#/, "").trim().toUpperCase();

const parseKmaObservationText = (text: string): WeatherObservation | null => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dataLines = lines.filter((line) => !line.startsWith("#"));
  const firstDataLine = dataLines.find((line) => /^\d{12}\s+/.test(line));

  if (!firstDataLine) {
    return null;
  }

  const headerLine = [...lines]
    .reverse()
    .find((line) => line.startsWith("#") && line.includes("TM") && line.includes("STN"));

  const values = firstDataLine.split(/\s+/);
  const headers = headerLine
    ? headerLine.split(/\s+/).map(normalizeHeaderName).filter(Boolean)
    : [];

  const valueByHeader = new Map<string, string>();
  headers.forEach((header, index) => {
    const value = values[index];
    if (value !== undefined) {
      valueByHeader.set(header, value);
    }
  });

  const valueAt = (header: string, fallbackIndex: number) =>
    valueByHeader.get(header) ?? values[fallbackIndex];

  const tm = valueAt("TM", 0);

  return {
    observedAt: parseKmaTimeToIso(tm),
    temperatureCelsius: parseNumber(valueAt("TA", 11)),
    humidityPercent: parseNumber(valueAt("HM", 13)),
    precipitationAmountMm: parseNumber(valueAt("RN", 14)),
    windSpeedMps: parseNumber(valueAt("WS", 3)),
    rawPayload: Object.fromEntries(
      values.map((value, index) => [headers[index] ?? `col_${index}`, value])
    )
  };
};

const fetchObservation = async (stationId: number, observedAt: Date): Promise<WeatherObservation | null> => {
  if (!env.KMA_API_KEY) {
    return null;
  }

  const url = new URL(env.KMA_ASOS_ENDPOINT);
  url.searchParams.set("tm", toKmaTime(observedAt));
  url.searchParams.set("stn", String(stationId));
  url.searchParams.set("help", "1");
  url.searchParams.set("authKey", env.KMA_API_KEY);

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  return parseKmaObservationText(await response.text());
};

export const getNearestKmaObservation = async (params: {
  stationId: number;
  baseDate: Date;
}): Promise<WeatherObservation | null> => {
  for (const candidateDate of candidateObservationTimes(params.baseDate)) {
    const observation = await fetchObservation(params.stationId, candidateDate);

    if (observation) {
      return observation;
    }
  }

  return null;
};
