import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contacts, dishSize, parseConfig, parseFeed, rateText } from './dsn';

const feedXml = readFileSync(new URL('./fixtures/dsn-sample.xml', import.meta.url), 'utf8');
const cfgXml = readFileSync(new URL('./fixtures/dsn-config.xml', import.meta.url), 'utf8');

describe('DSN Now feed', () => {
  const feed = parseFeed(feedXml);
  const cfg = parseConfig(cfgXml);

  it('reads the three complexes, every dish and the feed time', () => {
    expect(feed.sites.map((s) => s.label)).toEqual(['Goldstone', 'Madrid', 'Canberra']);
    expect(feed.dishes.length).toBe(11);
    expect(feed.time).toBe(1793600154000);
    expect(feed.dishes.find((d) => d.name === 'DSS14')?.site).toBe('gdscc');
  });

  it('names dishes, sizes and spacecraft from the config file', () => {
    expect(cfg.sites.cdscc).toBe('Canberra');
    expect(cfg.dishes.DSS43).toEqual({ label: 'DSS 43', type: '70M' });
    expect(cfg.craft.VGR1).toBe('Voyager 1');
    expect(cfg.craft.NHPC).toBe('New Horizons');
    expect(dishSize('34MHEF')).toBe('34 m');
  });

  it('turns active signals into contacts and skips dishes under maintenance', () => {
    const list = contacts(feed, cfg);
    expect(list.some((c) => c.dish === 'DSS 14')).toBe(false);
    const mro = list.find((c) => c.dish === 'DSS 65' && c.craft === 'MRO');
    expect(mro).toMatchObject({ site: 'Madrid', size: '34 m', name: 'Mars Reconnaissance Orbiter', verb: 'sending commands to' });
    const odyssey = list.find((c) => c.dish === 'DSS 53' && c.craft === 'M01O');
    expect(odyssey).toMatchObject({ verb: 'receiving data from', rate: 39820 });
    expect(list.filter((c) => c.craft === 'NHPC').length).toBeGreaterThan(0);
  });

  it('formats data rates', () => {
    expect(rateText(160)).toBe('160 b/s');
    expect(rateText(39820)).toBe('40 kb/s');
    expect(rateText(1979000)).toBe('2.0 Mb/s');
  });
});
