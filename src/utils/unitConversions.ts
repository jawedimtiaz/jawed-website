export function convertMetersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function convertFeetToMeters(feet: number): number {
  return feet / 3.28084;
}

export function convertMmToInches(mm: number): number {
  return mm / 25.4;
}

export function convertInchesToMm(inches: number): number {
  return inches * 25.4;
}

export function convertCelsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function convertFahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function convertKgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function convertLbsToKg(lbs: number): number {
  return lbs / 2.20462;
}
