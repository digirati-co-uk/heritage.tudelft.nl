import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function GlobalHeader() {
  const t = useTranslations();
  return (
    <div className="bg-[#1D1F71] text-white flex justify-center font-mono">
      <div className="max-w-screen-xl w-full px-10 flex py-6">
        <div>
          <Link href="/">{t("Academic Heritage")}</Link>
        </div>
        <ul className="ml-auto flex gap-5 ">
          <li>
            <Link className="uppercase text-md" href="/exhibitions">
              {"Exhibitions"}
            </Link>
          </li>
          <li>
            <Link className="uppercase text-md" href="/collections">
              {"Collections"}
            </Link>
          </li>
          <li>
            <Link className="uppercase text-md" href="/publications">
              {t("Publications")}
            </Link>
          </li>
          <li>
            <LanguageSwitcher />
          </li>
        </ul>
      </div>
    </div>
  );
}
