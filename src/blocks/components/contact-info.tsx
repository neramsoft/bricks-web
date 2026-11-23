import type { ReactNode } from "react";
import type { PublicContactInfo } from "@probiz/sdk";
import { HoursList } from "./hours";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";
import { itemHeading } from "../heading-level";

const PLATFORM_NAMES: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
  PINTEREST: "Pinterest",
  THREADS: "Threads",
  GITHUB: "GitHub",
};
const platformName = (platform: string) =>
  PLATFORM_NAMES[platform] ?? platform.charAt(0) + platform.slice(1).toLowerCase();

interface Cell {
  key: string;
  label: string;
  value: ReactNode;
  wide?: boolean;
}

/** The business's details from the settings (the API resolves them, so a change shows without republishing). */
export function ContactInfo({ block, ctx }: BlockProps<"contactInfo">) {
  const d = block.data;
  const info: PublicContactInfo = d.info ?? {};
  const labels = ctx.messages.blocks;
  const cells = d.show.flatMap((key): Cell[] => {
    switch (key) {
      case "email":
        return info.email
          ? [{ key, label: labels.email, value: <a href={info.email.href}>{info.email.value}</a> }]
          : [];
      case "phone":
        return info.phone
          ? [{ key, label: labels.phone, value: <a href={info.phone.href}>{info.phone.value}</a> }]
          : [];
      case "address": {
        const a = info.address;
        if (!a) return [];
        const city = [a.postalCode, a.city].filter(Boolean).join(" ");
        const lines = [a.label, a.street, city, a.region].filter(Boolean);
        return [
          {
            key,
            label: labels.address,
            value: (
              <address>
                {lines.map((line, index) => (
                  <span key={index} className="line">
                    {line}
                  </span>
                ))}
              </address>
            ),
          },
        ];
      }
      case "companyId":
        return info.companyId ? [{ key, label: labels.companyId, value: info.companyId }] : [];
      case "vatId":
        return info.vatId ? [{ key, label: labels.vatId, value: info.vatId }] : [];
      case "hours":
        return info.hours && info.hours.weekly.length > 0
          ? [
              {
                key,
                label: labels.hours,
                wide: true,
                value: (
                  <HoursList
                    hours={info.hours}
                    locale={ctx.locale}
                    messages={ctx.messages}
                    timeZone={ctx.timeZone}
                    subHeading={itemHeading(Boolean(d.heading))}
                  />
                ),
              },
            ]
          : [];
      case "social":
        return info.social && info.social.length > 0
          ? [
              {
                key,
                label: labels.social,
                value: (
                  <ul className="social">
                    {info.social.map((link) => (
                      <li key={link.platform}>
                        <a href={link.url} rel="noopener noreferrer me" target="_blank">
                          {platformName(link.platform)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]
          : [];
      default:
        return [];
    }
  });
  if (cells.length === 0) return null;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} />
      <ul className="contact-grid">
        {cells.map((cell) => (
          <li key={cell.key} data-reveal>
            <p className="k">{cell.label}</p>
            <div className="v">{cell.value}</div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
