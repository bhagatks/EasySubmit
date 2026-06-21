"use client";

import { Crosshair, Mail, User } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { CityStateField } from "@/components/onboarding/hub/CityStateField";
import { PhoneField } from "@/components/onboarding/hub/PhoneField";
import { TargetRoleField } from "@/components/onboarding/hub/TargetRoleField";
import { proceedToNextPhaseLabel } from "@/lib/onboarding/workbenchPhases";
import { WorkbenchPhaseIntro } from "@/components/onboarding/hub/WorkbenchPhaseIntro";
import { isIdentityPhaseComplete } from "@/lib/onboarding/identity";
import { DEFAULT_DIAL_CODE } from "@/lib/phone/countryCodes";
import {
  formatFullPhone,
  formatNationalNumber,
  isValidPhoneNumber,
} from "@/lib/phone/phone";
import { splitFullName } from "@/lib/resume/openResume/adapter";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
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
};

type CoordinatesPanelProps = {
  initialFirstName?: string;
  initialLastName?: string;
  /** @deprecated Prefer initialFirstName + initialLastName */
  initialFullName?: string;
  initialEmail?: string;
  initialValues?: CoordinatesValues;
  monoClass: string;
  onContinue: (values: CoordinatesValues) => void;
  onChange?: (values: CoordinatesValues) => void;
  hidePhaseIntro?: boolean;
};

function TechLabel({
  htmlFor,
  children,
  monoClass,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  monoClass: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        monoClass,
        "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em]",
        className,
      )}
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

export function CoordinatesPanel({
  initialFirstName = "",
  initialLastName = "",
  initialFullName = "",
  initialEmail = "",
  initialValues,
  monoClass,
  onContinue,
  onChange,
  hidePhaseIntro = false,
}: CoordinatesPanelProps) {
  const identity = useOnboardingStore((state) => state.identity);
  const setTargetRole = useOnboardingStore((state) => state.setTargetRole);
  const markIdentityPhaseComplete = useOnboardingStore(
    (state) => state.markIdentityPhaseComplete,
  );

  const nameParts = splitFullName(initialFullName);
  const [firstName, setFirstName] = useState(
    initialValues?.firstName || initialFirstName || nameParts.firstName,
  );
  const [lastName, setLastName] = useState(
    initialValues?.lastName || initialLastName || nameParts.lastName,
  );
  const [cityState, setCityState] = useState(initialValues?.cityState ?? "");
  const [phoneDialCode, setPhoneDialCode] = useState(
    initialValues?.phoneDialCode ?? DEFAULT_DIAL_CODE,
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email || initialEmail);

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
  }, [initialValues]);

  useEffect(() => {
    if (initialValues) return;

    if (initialFirstName.trim() && !firstName.trim()) {
      setFirstName(initialFirstName.trim());
    }
    if (initialLastName.trim() && !lastName.trim()) {
      setLastName(initialLastName.trim());
      return;
    }
    if (!lastName.trim() && initialFullName.trim()) {
      const parts = splitFullName(initialFullName);
      if (parts.lastName) {
        setLastName(parts.lastName);
      }
    }
  }, [
    initialFirstName,
    initialLastName,
    initialFullName,
    initialValues,
    firstName,
    lastName,
  ]);

  useEffect(() => {
    if (initialFullName.trim() && !initialFirstName && !initialLastName && !initialValues?.firstName) {
      const parts = splitFullName(initialFullName);
      setFirstName(parts.firstName);
      setLastName(parts.lastName);
    }
  }, [initialFullName, initialFirstName, initialLastName, initialValues?.firstName]);

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
    onChange,
  ]);

  const isValid =
    isIdentityPhaseComplete(identity) &&
    values.firstName.length > 0 &&
    isValidPhoneNumber(values.phoneDialCode, values.phone) &&
    values.email.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || !markIdentityPhaseComplete()) return;
    onContinue(values);
  }

  return (
    <div className="flex flex-1 flex-col">
      {!hidePhaseIntro ? (
        <WorkbenchPhaseIntro
          phaseId={1}
          monoClass={monoClass}
          icon={<Crosshair className="h-3.5 w-3.5" aria-hidden="true" />}
        />
      ) : null}

      <form
        className={cn("flex flex-1 flex-col space-y-5", hidePhaseIntro ? "mt-0" : "mt-4")}
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

        <TargetRoleField
          id="hub-target-role"
          value={identity.targetRole}
          onChange={setTargetRole}
          monoClass={monoClass}
        />

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
          {proceedToNextPhaseLabel(1)}
        </button>
      </form>
    </div>
  );
}
