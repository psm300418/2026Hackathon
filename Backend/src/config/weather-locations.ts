import type { WeatherLocationOption } from "../types/weather.js";

export const WEATHER_LOCATION_OPTIONS: WeatherLocationOption[] = [
  { id: "seoul-gangnam", regionLabel: "서울특별시 강남구", stationId: 108, stationName: "서울" },
  { id: "seoul-jongno", regionLabel: "서울특별시 종로구", stationId: 108, stationName: "서울" },
  { id: "busan-haeundae", regionLabel: "부산광역시 해운대구", stationId: 159, stationName: "부산" },
  { id: "daegu-suseong", regionLabel: "대구광역시 수성구", stationId: 143, stationName: "대구" },
  { id: "incheon-namdong", regionLabel: "인천광역시 남동구", stationId: 112, stationName: "인천" },
  { id: "gwangju-bukgu", regionLabel: "광주광역시 북구", stationId: 156, stationName: "광주" },
  { id: "daejeon-yuseong", regionLabel: "대전광역시 유성구", stationId: 133, stationName: "대전" },
  { id: "ulsan-namgu", regionLabel: "울산광역시 남구", stationId: 152, stationName: "울산" },
  { id: "sejong", regionLabel: "세종특별자치시", stationId: 239, stationName: "세종" },
  { id: "gyeonggi-suwon", regionLabel: "경기도 수원시", stationId: 119, stationName: "수원" },
  { id: "gangwon-chuncheon", regionLabel: "강원특별자치도 춘천시", stationId: 101, stationName: "춘천" },
  { id: "chungbuk-cheongju", regionLabel: "충청북도 청주시", stationId: 131, stationName: "청주" },
  { id: "chungnam-cheonan", regionLabel: "충청남도 천안시", stationId: 232, stationName: "천안" },
  { id: "jeonbuk-jeonju", regionLabel: "전북특별자치도 전주시", stationId: 146, stationName: "전주" },
  { id: "jeonnam-mokpo", regionLabel: "전라남도 목포시", stationId: 165, stationName: "목포" },
  { id: "gyeongbuk-pohang", regionLabel: "경상북도 포항시", stationId: 138, stationName: "포항" },
  { id: "gyeongnam-changwon", regionLabel: "경상남도 창원시", stationId: 155, stationName: "창원" },
  { id: "jeju-jeju", regionLabel: "제주특별자치도 제주시", stationId: 184, stationName: "제주" }
];

export const findWeatherLocationOption = (id: string): WeatherLocationOption | undefined =>
  WEATHER_LOCATION_OPTIONS.find((option) => option.id === id);
