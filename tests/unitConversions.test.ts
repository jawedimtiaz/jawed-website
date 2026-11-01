import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertMetersToFeet,
  convertFeetToMeters,
  convertMmToInches,
  convertInchesToMm,
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
  convertKgToLbs,
  convertLbsToKg,
} from '../src/utils/unitConversions';

function assertCloseTo(actual: number, expected: number, precision: number = 2) {
  const delta = Math.abs(actual - expected);
  const maxDelta = Math.pow(10, -precision);
  assert.ok(
    delta <= maxDelta,
    `Expected ${actual} to be close to ${expected} within delta ${maxDelta}, but diff was ${delta}`
  );
}

describe('Metric vs Imperial Conversion Utility', () => {
  describe('Distance (Meters <-> Feet)', () => {
    it('converts standard meters to feet correctly', () => {
      const feet = convertMetersToFeet(10);
      assertCloseTo(feet, 32.8084, 3);
    });

    it('converts feet to meters correctly', () => {
      const meters = convertFeetToMeters(32.8084);
      assertCloseTo(meters, 10, 3);
    });

    it('handles zero and negative distance inputs', () => {
      assert.equal(convertMetersToFeet(0), 0);
      assertCloseTo(convertMetersToFeet(-5), -16.4042, 3);
      assertCloseTo(convertFeetToMeters(-10), -3.048, 3);
    });

    it('handles extreme distance values', () => {
      assertCloseTo(convertMetersToFeet(1_000_000), 3_280_840, 0);
      assertCloseTo(convertMetersToFeet(-1_000_000), -3_280_840, 0);
    });
  });

  describe('Short Distance (Millimeters <-> Inches)', () => {
    it('converts mm to inches correctly', () => {
      const inches = convertMmToInches(25.4);
      assert.equal(inches, 1);
    });

    it('converts inches to mm correctly', () => {
      const mm = convertInchesToMm(2);
      assert.equal(mm, 50.8);
    });

    it('handles zero and negative inputs', () => {
      assert.equal(convertMmToInches(0), 0);
      assert.equal(convertMmToInches(-25.4), -1);
      assert.equal(convertInchesToMm(-5), -127);
    });

    it('handles extreme short distance values', () => {
      assertCloseTo(convertMmToInches(100_000), 3937.00787, 3);
    });
  });

  describe('Temperature (Celsius <-> Fahrenheit)', () => {
    it('converts freezing point correctly', () => {
      assert.equal(convertCelsiusToFahrenheit(0), 32);
      assert.equal(convertFahrenheitToCelsius(32), 0);
    });

    it('converts boiling point correctly', () => {
      assert.equal(convertCelsiusToFahrenheit(100), 212);
      assert.equal(convertFahrenheitToCelsius(212), 100);
    });

    it('converts negative and extreme temperatures correctly', () => {
      // -40°C is equal to -40°F
      assert.equal(convertCelsiusToFahrenheit(-40), -40);
      assert.equal(convertFahrenheitToCelsius(-40), -40);

      // Absolute zero in Celsius (-273.15 °C)
      const absZeroF = convertCelsiusToFahrenheit(-273.15);
      assertCloseTo(absZeroF, -459.67, 2);
    });
  });

  describe('Weight / Mass (Kilograms <-> Pounds)', () => {
    it('converts kg to lbs correctly', () => {
      const lbs = convertKgToLbs(10);
      assertCloseTo(lbs, 22.0462, 3);
    });

    it('converts lbs to kg correctly', () => {
      const kg = convertLbsToKg(22.0462);
      assertCloseTo(kg, 10, 3);
    });

    it('handles zero and negative weights', () => {
      assert.equal(convertKgToLbs(0), 0);
      assertCloseTo(convertKgToLbs(-5), -11.0231, 3);
      assertCloseTo(convertLbsToKg(-22.0462), -10, 3);
    });

    it('handles extreme weights', () => {
      assertCloseTo(convertKgToLbs(50_000), 110_231, 0);
    });
  });
});
