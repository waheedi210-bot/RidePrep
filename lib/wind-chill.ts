/**
 * NWS / Environment Canada wind-chill index (metric, 2001).
 *
 *     T_wc = 13.12 + 0.6215 T − 11.37 V^0.16 + 0.3965 T V^0.16
 *
 * T is air temperature in °C, V is wind speed in km/h. The formula is only
 * valid at or below 10 °C with a wind of at least 4.8 km/h — outside that
 * window it overstates cooling, so we return the air temperature instead.
 *
 * @see https://www.weather.gov/media/epz/wxcalc/windChill.pdf
 */
export const WIND_CHILL_MAX_TEMP_C = 10;
export const WIND_CHILL_MIN_WIND_KPH = 4.8;

export function isWindChillApplicable(
  temperatureC: number,
  windSpeedKph: number,
): boolean {
  return (
    temperatureC <= WIND_CHILL_MAX_TEMP_C &&
    windSpeedKph >= WIND_CHILL_MIN_WIND_KPH
  );
}

export function windChillC(temperatureC: number, windSpeedKph: number): number {
  if (!isWindChillApplicable(temperatureC, windSpeedKph)) {
    return temperatureC;
  }

  const windFactor = windSpeedKph ** 0.16;

  return (
    13.12 +
    0.6215 * temperatureC -
    11.37 * windFactor +
    0.3965 * temperatureC * windFactor
  );
}

/**
 * How cold exposed skin feels: the colder of the NWS wind-chill index and
 * Open-Meteo's Steadman apparent temperature (which also folds in humidity).
 */
export function apparentWindChillC(
  temperatureC: number,
  windSpeedKph: number,
  apparentTemperatureC: number,
): number {
  return Math.min(
    windChillC(temperatureC, windSpeedKph),
    apparentTemperatureC,
  );
}
