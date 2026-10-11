import { describe, expect, it } from 'vitest';
import { format31, parse31, parse40, roundUp, score31, severityOf } from './cvss';

const known: [string, number][] = [
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8], ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', 10.0],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1], ['CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 7.8],
  ['CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 8.8], ['CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N', 5.9],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H', 7.5], ['CVSS:3.1/AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 6.8],
  ['CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H', 7.2], ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N', 0],
  ['CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N', 6.4], ['CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N', 4.3],
];

describe('CVSS v3.1', () => {
  it.each(known)('%s scores %d', (vector, expected) => {
    const parsed = parse31(vector);
    expect(parsed).not.toBeNull();
    if (parsed) { expect(score31(parsed)).toBe(expected); expect(format31(parsed)).toBe(vector); }
  });
  it('rejects incomplete or invalid vectors', () => {
    expect(parse31('CVSS:3.1/AV:N/AC:L')).toBeNull();
    expect(parse31('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBeNull();
    expect(parse31('CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBeNull();
  });
  it('rounds up using the specification method', () => { expect(roundUp(4.02)).toBe(4.1); expect(roundUp(4.0)).toBe(4.0); expect(roundUp(4.000001)).toBe(4.0); });
});

describe('CVSS v4.0 and severity', () => {
  it('validates mandatory v4.0 base metrics', () => {
    expect(parse40('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N')).not.toBeNull();
    expect(parse40('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H')).toBeNull();
  });
  it('maps scores to bands', () => {
    expect([0, 0.1, 3.9, 4, 6.9, 7, 8.9, 9, 10].map(severityOf)).toEqual(['INFO', 'LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'CRITICAL', 'CRITICAL']);
  });
});
