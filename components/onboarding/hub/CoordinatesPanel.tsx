"use client";

import { Crosshair, Link2, Mail, User } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { CityStateField } from "@/components/onboarding/hub/CityStateField";
import { PhoneField } from "@/components/onboarding/hub/PhoneField";
import { workbenchPhaseHeader, getWorkbenchPhase } from "@/lib/onboarding/workbenchPhases";
import { DEFAULT_DIAL_CODE } from "@/lib/phone/countryCodes";
import {
  formatFullPhone,
  formatNationalNumber,
  isValidPhoneNumber,
} from "@/lib/phone/phone";
import { splitFullName } from "@/lib/resume/openResume/adapter";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)] transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

export type CoordinatesValues = {
  firstName: string;
  lastName: string;
  cityState: string;
  phoneDialCode: string;
  phone: string;
  email: string;
  linkedIn: string;
};

type CoordinatesPanelProps = {
  initialFullName?: string;
  initialEmail?: string;
  initialValues?: CoordinatesValues;
  monoClass: string;
  onContinue: (values: CoordinatesValues) => void;
  onChange?: (values: CoordinatesValues) => void;
};

function TechLabel({
  htmlFor,
  children,
  monoClass,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  monoClass: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        monoClass,
        "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em]",
      )}
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

export function CoordinatesPanel({
  initialFullName = "",
  initialEmail = "",
  initialValues,
  monoClass,
  onContinue,
  onChange,
}: CoordinatesPanelProps) {
  const nameParts = splitFullName(initialFullName);
  const [firstName, setFirstName] = useState(
    initialValues?.firstName || nameParts.firstName,
  );
  const [lastName, setLastName] = useState(
    initialValues?.lastName || nameParts.lastName,
  );
  const [cityState, setCityState] = useState(initialValues?.cityState ?? "");
  const [phoneDialCode, setPhoneDialCode] = useState(
    initialValues?.phoneDialCode ?? DEFAULT_DIAL_CODE,
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email || initialEmail);
  const [linkedIn, setLinkedIn] = useState(initialValues?.linkedIn ?? "");

  useEffect(() => {
    if (!initialValues) return;

    setFirstName(initialValues.firstName);
    setLastName(initialValues.lastName);
    setCityState(initialValues.cityState);
    setPhoneDialCode(initialValues.phoneDialCode || DEFAULT_DIAL_CODE);
    setPhone(
      formatNationalNumber(
        initialValues.phoneDialCode || DEFAULT_DIAL_CODE,
        initialValues.phone,
      ),
    );
    setEmail(initialValues.email);
    setLinkedIn(initialValues.linkedIn);
  }, [initialValues]);

  useEffect(() => {
    if (initialFullName.trim() && !firstName && !lastName && !initialValues?.firstName) {
      const parts = splitFullName(initialFullName);
      setFirstName(parts.firstName);
      setLastName(parts.lastName);
    }
  }, [initialFullName, firstName, lastName, initialValues?.firstName]);

  useEffect(() => {
    if (initialEmail.trim() && !email.trim() && !initialValues?.email) {
      setEmail(initialEmail.trim());
    }
  }, [initialEmail, email, initialValues?.email]);

  const values: CoordinatesValues = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    cityState: cityState.trim(),
    phoneDialCode,
    phone: phone.trim(),
    email: email.trim(),
    linkedIn: linkedIn.trim(),
  };

  useEffect(() => {
    onChange?.(values);
  }, [
    firstName,
    lastName,
    cityState,
    phoneDialCode,
    phone,
    email,
    linkedIn,
    onChange,
  ]);

  const isValid =
    values.firstName.length > 0 &&
    isValidPhoneNumber(values.phoneDialCode, values.phone) &&
    values.email.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;
    onContinue(values);
  }

  return (
    <div className="flex flex-1 flex-col">
      <p
        className={cn(monoClass, "text-[11px] font-medium uppercase tracking-[0.2em]")}
        style={{ color: PRIMARY }}
      >
        <Crosshair className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
        {workbenchPhaseHeader(1)}
      </p>
      <h2
        className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl"
        style={{ color: "oklch(0.98 0.01 268)" }}
      >
        {getWorkbenchPhase(1)?.headline ?? "Contact & identity"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
        {getWorkbenchPhase(1)?.description}
      </p>

      <form
        className="mt-8 flex flex-1 flex-col space-y-5"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <TechLabel htmlFor="hub-first-name" monoClass={monoClass}>
              First Name
            </TechLabel>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: MINT }}
                aria-hidden="true"
              />
              <input
                id="hub-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="off"
                name="es-coordinates-first"
                className={cn(INPUT_CLASS, "pl-10")}
                placeholder="Jane"
              />
            </div>
          </div>
          <div>
            <TechLabel htmlFor="hub-last-name" monoClass={monoClass}>
              Last Name
            </TechLabel>
            <input
              id="hub-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="off"
              name="es-coordinates-last"
              className={INPUT_CLASS}
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <TechLabel htmlFor="hub-city-state" monoClass={monoClass}>
            City, state & Zipcode
          </TechLabel>
          <CityStateField
            id="hub-city-state"
            value={cityState}
            onChange={setCityState}
            monoClass={monoClass}
            inputClass={INPUT_CLASS}
          />
        </div>

        <div>
          <TechLabel htmlFor="hub-phone" monoClass={monoClass}>
            Phone <span style={{ color: MINT }}>*</span>
          </TechLabel>
          <PhoneField
            id="hub-phone"
            dialCode={phoneDialCode}
            nationalNumber={phone}
            onDialCodeChange={(code) => {
              setPhoneDialCode(code);
              setPhone((current) => formatNationalNumber(code, current));
            }}
            onNationalNumberChange={setPhone}
            monoClass={monoClass}
            inputClass={INPUT_CLASS}
          />
        </div>

        <div>
          <TechLabel htmlFor="hub-email" monoClass={monoClass}>
            Email
          </TechLabel>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: MINT }}
              aria-hidden="true"
            />
            <input
              id="hub-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              name="es-coordinates-email"
              className={cn(INPUT_CLASS, "pl-10")}
              placeholder="you@email.com"
            />
          </div>
        </div>

        <div>
          <TechLabel htmlFor="hub-linkedin" monoClass={monoClass}>
            LinkedIn URL
          </TechLabel>
          <div className="relative">
            <Link2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: MINT }}
              aria-hidden="true"
            />
            <input
              id="hub-linkedin"
              type="url"
              value={linkedIn}
              onChange={(event) => setLinkedIn(event.target.value)}
              autoComplete="off"
              name="es-coordinates-linkedin"
              className={cn(INPUT_CLASS, "pl-10")}
              placeholder="linkedin.com/in/yourname"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="mt-auto w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: PRIMARY,
            color: "oklch(0.98 0.01 268)",
            boxShadow: "0 0 40px -12px oklch(0.62 0.21 265 / 0.55)",
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
