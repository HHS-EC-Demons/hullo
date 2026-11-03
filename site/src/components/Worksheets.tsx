import { forwardRef, type ReactNode } from 'react';
import { WORDMARK } from '../brand';
import { NASA_LIGHT_DAY_UTC } from './LightDay';
import { C_KM_S, splitHms } from '../lib/lighttime';
import type { Shot } from '../lib/ranging';
import { groupInt } from '../lib/client';
import { calDate, localStamp } from '../lib/dates';
import './worksheet.css';

export const AU_KM = 149597870.7;
const MOON_RECEDES_CM = 3.8;

export interface Flight {
  n: number;
  sol: number;
  date: string;
  from: string;
  to: string;
  dist_m: number | null;
  duration_s: number | null;
  max_speed_m_s: number | null;
}

export interface MoonShot {
  shot: Shot;
  stationName: string;
  reflectorName: string;
}

/** Number text with thousands commas and a fixed count of decimals, without Intl. */
export function fixed(n: number, digits: number): string {
  const [whole, frac] = Math.abs(n).toFixed(digits).split('.');
  return `${n < 0 ? '-' : ''}${groupInt(Number(whole))}${frac ? `.${frac}` : ''}`;
}

const fmt = (digits: number) => ({ format: (n: number) => fixed(n, digits) });
export const int = fmt(0);
export const one = fmt(1);
const two = fmt(2);
const three = fmt(3);
export const six = fmt(6);
export const dayFmt = { format: calDate };

export function atText(ms: number): string {
  return localStamp(ms);
}

function Sheet({ title, printedAt, intro, numbers, questions, answers, source }: { title: string; printedAt: number; intro: string; numbers: string[]; questions: string[]; answers: ReactNode[]; source: string }) {
  return (
    <>
      <article className="ws-page">
        <header className="ws-head">
          <p className="ws-mark" translate="no">
            {WORDMARK}
          </p>
          <p className="ws-name">Name</p>
          <p className="ws-date">Printed {atText(printedAt)}</p>
        </header>
        <h1 className="ws-title">{title}</h1>
        <p className="ws-intro">{intro}</p>
        <ul className="ws-numbers">
          {numbers.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <ol className="ws-questions">
          {questions.map((q) => (
            <li key={q}>
              <p>{q}</p>
              <span className="ws-lines" />
              <span className="ws-lines" />
            </li>
          ))}
        </ol>
        <footer className="ws-foot">{source}</footer>
      </article>
      <article className="ws-page ws-key">
        <header className="ws-head">
          <p className="ws-mark" translate="no">
            {WORDMARK}
          </p>
          <p className="ws-date">Answer key, printed {atText(printedAt)}</p>
        </header>
        <h1 className="ws-title">{title}</h1>
        <ol className="ws-answers">
          {answers.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
        <footer className="ws-foot">{source}</footer>
      </article>
    </>
  );
}

export const MoonSheet = forwardRef<HTMLDivElement, { m: MoonShot; printedAt: number }>(function MoonSheet({ m, printedAt }, ref) {
  const t = m.shot.round_trip_s;
  const oneWay = t / 2;
  const km = oneWay * C_KM_S;
  const years = 100000 / MOON_RECEDES_CM;
  return (
    <div ref={ref} className="ws">
      <Sheet
        title="How far away is the Moon?"
        printedAt={printedAt}
        intro={`At ${atText(m.shot.ms)}, the ${m.stationName} Observatory in New Mexico fires a laser pulse at the mirror that the ${m.reflectorName} crew left on the Moon. The light bounces off the mirror and comes back to the telescope.`}
        numbers={[
          `Time for the pulse to go and come back is ${six.format(t)} s.`,
          `Light travels ${three.format(C_KM_S)} km every second.`,
          `The Moon moves away from Earth by about ${one.format(MOON_RECEDES_CM)} cm every year.`,
        ]}
        questions={[
          'The pulse travels to the mirror and back. How many seconds does the trip to the mirror take?',
          'How far is the mirror from the telescope, in kilometers?',
          'Round your answer to the nearest 1,000 km.',
          'How many years will it take for the Moon to move 1 km farther away?',
        ]}
        answers={[
          <>
            {six.format(t)} s ÷ 2 = <b>{six.format(oneWay)} s</b>
          </>,
          <>
            {six.format(oneWay)} s × {three.format(C_KM_S)} km/s = <b>{int.format(km)} km</b>
          </>,
          <>
            <b>{int.format(Math.round(km / 1000) * 1000)} km</b>
          </>,
          <>
            1 km = 100,000 cm, and 100,000 cm ÷ {one.format(MOON_RECEDES_CM)} cm a year = <b>about {int.format(years)} years</b>
          </>,
        ]}
        source="Distances worked out from NASA JPL Horizons positions. The Moon moving away comes from the International Laser Ranging Service at NASA Goddard."
      />
    </div>
  );
});

export const VoyagerSheet = forwardRef<HTMLDivElement, { seconds: number; printedAt: number }>(function VoyagerSheet({ seconds, printedAt }, ref) {
  const { h, m, s } = splitHms(seconds);
  const whole = h * 3600 + m * 60 + s;
  const km = whole * C_KM_S;
  const au = km / AU_KM;
  const day = 86400 * C_KM_S;
  return (
    <div ref={ref} className="ws">
      <Sheet
        title="How far away is Voyager 1?"
        printedAt={printedAt}
        intro={`Voyager 1 was launched in 1977 and still sends radio signals home. At ${atText(printedAt)}, its signal takes ${h} h ${m} min ${s} s to reach Earth.`}
        numbers={[
          `Light and radio travel ${three.format(C_KM_S)} km every second.`,
          `1 astronomical unit (au) is ${one.format(AU_KM)} km, the average distance from Earth to the Sun.`,
          '1 day is 86,400 s.',
        ]}
        questions={[
          `How many seconds is ${h} h ${m} min ${s} s?`,
          'How far is Voyager 1 from Earth, in kilometers?',
          'How many au is that? Round to one decimal place.',
          `NASA says Voyager 1 will be one light-day away on ${dayFmt.format(Date.parse(NASA_LIGHT_DAY_UTC))}. How many kilometers is one light-day?`,
        ]}
        answers={[
          <>
            {h} × 3,600 s + {m} × 60 s + {s} s = <b>{int.format(whole)} s</b>
          </>,
          <>
            {int.format(whole)} s × {three.format(C_KM_S)} km/s = <b>{int.format(km)} km</b>
          </>,
          <>
            {int.format(km)} km ÷ {one.format(AU_KM)} km = <b>{one.format(au)} au</b>
          </>,
          <>
            86,400 s × {three.format(C_KM_S)} km/s = <b>{int.format(day)} km</b>
          </>,
        ]}
        source="Light time worked out from NASA JPL Horizons positions. The au comes from JPL’s astrodynamic parameters and the light-day date from NASA’s Voyager mission page."
      />
    </div>
  );
});

export const FlightSheet = forwardRef<HTMLDivElement, { f: Flight; printedAt: number }>(function FlightSheet({ f, printedAt }, ref) {
  const d = f.dist_m as number;
  const t = f.duration_s as number;
  const v = d / t;
  const kmh = v * 3.6;
  const perKm = 1000 / v;
  const date = calDate(f.date);
  return (
    <div ref={ref} className="ws">
      <Sheet
        title="How fast did Ingenuity fly?"
        printedAt={printedAt}
        intro={`Ingenuity was the first helicopter to fly on another planet. On ${date}, sol ${f.sol} of the mission, Ingenuity made flight ${f.n} over Jezero crater on Mars.`}
        numbers={[
          `Distance flown is ${int.format(d)} m.`,
          `Time in the air is ${one.format(t)} s.`,
          ...(f.max_speed_m_s ? [`Top speed is ${one.format(f.max_speed_m_s)} m/s.`] : []),
          '1 m/s is the same as 3.6 km/h.',
        ]}
        questions={[
          'What was the average speed in meters per second? Round to two decimal places.',
          'What is that speed in kilometers per hour?',
          f.max_speed_m_s ? 'Why is the average speed lower than the top speed?' : 'Why might the helicopter fly slower than average at the start and end?',
          'At the average speed, how many seconds would Ingenuity take to fly 1 km?',
        ]}
        answers={[
          <>
            {int.format(d)} m ÷ {one.format(t)} s = <b>{two.format(v)} m/s</b>
          </>,
          <>
            {two.format(v)} m/s × 3.6 = <b>{one.format(kmh)} km/h</b>
          </>,
          <>Ingenuity climbs, speeds up, slows down and lands, so part of the time is spent below its top speed. Any answer that says this is right.</>,
          <>
            1,000 m ÷ {two.format(v)} m/s = <b>{int.format(perKm)} s</b>, about {int.format(perKm / 60)} min
          </>,
        ]}
        source="Distance, time and speed from NASA’s Ingenuity flight log."
      />
    </div>
  );
});
