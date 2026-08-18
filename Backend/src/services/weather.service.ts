import { z } from "zod";
import {
  WEATHER_LOCATION_OPTIONS,
  findWeatherLocationOption
} from "../config/weather-locations.js";
import { getNearestKmaObservation } from "../gateways/kma-weather.gateway.js";
import {
  findUserLocation,
  upsertDailyRecordEnvironment,
  upsertUserLocation
} from "../repositories/weather.repository.js";
import { ApiError } from "../types/http.js";
import type {
  DailyRecordEnvironmentDto,
  DailyRecordEnvironmentRow,
  UserLocationDto,
  UserLocationRow
} from "../types/weather.js";

const locationInputSchema = z.object({
  locationId: z.string().min(1)
});

export const parseLocationInput = (body: unknown) => locationInputSchema.parse(body);

const toUserLocationDto = (location: UserLocationRow): UserLocationDto => ({
  id: location.id,
  regionLabel: location.region_label,
  weatherStationId: location.weather_station_id,
  weatherStationName: location.weather_station_name,
  createdAt: location.created_at,
  updatedAt: location.updated_at
});

export const toDailyRecordEnvironmentDto = (
  environment: DailyRecordEnvironmentRow | undefined
): DailyRecordEnvironmentDto | null => {
  if (!environment) {
    return null;
  }

  return {
    id: environment.id,
    source: environment.source,
    regionLabel: environment.region_label,
    weatherStationId: environment.weather_station_id,
    weatherStationName: environment.weather_station_name,
    observedAt: environment.observed_at,
    temperatureCelsius: environment.temperature_celsius,
    humidityPercent: environment.humidity_percent,
    precipitationAmountMm: environment.precipitation_amount_mm,
    windSpeedMps: environment.wind_speed_mps
  };
};

export const getLocationOptions = () => ({
  items: WEATHER_LOCATION_OPTIONS.map((option) => ({
    id: option.id,
    regionLabel: option.regionLabel,
    weatherStationId: option.stationId,
    weatherStationName: option.stationName
  }))
});

export const getMyLocation = async (userId: string): Promise<UserLocationDto | null> => {
  const location = await findUserLocation(userId);
  return location ? toUserLocationDto(location) : null;
};

export const saveMyLocation = async (
  userId: string,
  input: {
    locationId: string;
  }
): Promise<UserLocationDto> => {
  const option = findWeatherLocationOption(input.locationId);

  if (!option) {
    throw new ApiError(400, "BAD_REQUEST", "지원하지 않는 지역입니다.");
  }

  const location = await upsertUserLocation({
    userId,
    regionLabel: option.regionLabel,
    weatherStationId: option.stationId,
    weatherStationName: option.stationName
  });

  return toUserLocationDto(location);
};

export const attachWeatherEnvironmentToDailyRecord = async (params: {
  userId: string;
  dailyRecordId: string;
  baseDate: Date;
}): Promise<DailyRecordEnvironmentRow | null> => {
  const location = await findUserLocation(params.userId);

  if (!location) {
    return null;
  }

  const observation = await getNearestKmaObservation({
    stationId: location.weather_station_id,
    baseDate: params.baseDate
  });

  if (!observation) {
    return null;
  }

  return upsertDailyRecordEnvironment({
    dailyRecordId: params.dailyRecordId,
    regionLabel: location.region_label,
    weatherStationId: location.weather_station_id,
    weatherStationName: location.weather_station_name,
    observedAt: observation.observedAt,
    temperatureCelsius: observation.temperatureCelsius,
    humidityPercent: observation.humidityPercent,
    precipitationAmountMm: observation.precipitationAmountMm,
    windSpeedMps: observation.windSpeedMps,
    rawPayload: observation.rawPayload
  });
};
