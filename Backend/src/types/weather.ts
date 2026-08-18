export type WeatherLocationOption = {
  id: string;
  regionLabel: string;
  stationId: number;
  stationName: string;
};

export type UserLocationRow = {
  id: string;
  user_id: string;
  region_label: string;
  weather_station_id: number;
  weather_station_name: string;
  created_at: string;
  updated_at: string;
};

export type UserLocationDto = {
  id: string;
  regionLabel: string;
  weatherStationId: number;
  weatherStationName: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyRecordEnvironmentRow = {
  id: string;
  daily_record_id: string;
  source: string;
  region_label: string | null;
  weather_station_id: number | null;
  weather_station_name: string | null;
  observed_at: string | null;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  precipitation_amount_mm: number | null;
  wind_speed_mps: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

export type DailyRecordEnvironmentDto = {
  id: string;
  source: string;
  regionLabel: string | null;
  weatherStationId: number | null;
  weatherStationName: string | null;
  observedAt: string | null;
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  precipitationAmountMm: number | null;
  windSpeedMps: number | null;
};

export type WeatherObservation = {
  observedAt: string;
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  precipitationAmountMm: number | null;
  windSpeedMps: number | null;
  rawPayload: Record<string, unknown>;
};
