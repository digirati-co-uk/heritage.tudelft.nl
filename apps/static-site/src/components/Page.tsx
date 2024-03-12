import { useLocale, useTranslations } from "next-intl";
import { ReactNode, Suspense, useTransition } from "react";
import { SocialIcon } from "react-social-icons";

import "react-social-icons/twitter";

export async function Page(props: { children: ReactNode }) {
  const t = useTranslations();
  const lang = useLocale();
  return (
    <>
      <div className="min-h-[90vh] w-full max-w-screen-xl px-10">
        <Suspense fallback="Loading...">{props.children}</Suspense>
      </div>
      <footer className="w-full bg-[#1D1F71] p-8 text-white">
        <div className="mx-auto flex max-w-screen-xl justify-between">
          <div>
            <h2 className="mb-12 max-w-96 font-sans text-4xl">{t("Delft University of Technology")}</h2>
            <div className="flex gap-2">
              <div>
                <SocialIcon url="https://www.facebook.com/tudelft" bgColor="#fff" color="#000" fgColor="#1D1F71" />
              </div>
              <div>
                <SocialIcon
                  network="x"
                  url="https://twitter.com/tudelft"
                  bgColor="#fff"
                  color="#000"
                  fgColor="#1D1F71"
                />
              </div>
              <div>
                <SocialIcon url="https://www.instagram.com/tudelft/" bgColor="#fff" color="#000" fgColor="#1D1F71" />
              </div>
              <div>
                <SocialIcon url="https://www.youtube.com/user/tudelft" bgColor="#fff" color="#000" fgColor="#1D1F71" />
              </div>
              <div>
                <SocialIcon
                  url="https://www.linkedin.com/edu/delft-university-of-technology-15445"
                  bgColor="#fff"
                  color="#000"
                  fgColor="#1D1F71"
                />
              </div>
              <div>
                <SocialIcon
                  network="whatsapp"
                  url="https://wa.me/+3197010256278"
                  bgColor="#fff"
                  color="#000"
                  fgColor="#1D1F71"
                />
              </div>
            </div>
          </div>

          <div className="text-lg">
            <address className="not-italic">
              <div>Postbus 5</div>
              <div>2600 AA Delft</div>
              {lang === "en" ? <div>The Netherlands</div> : null}
            </address>
            <div>
              <a
                className="underline"
                href="https://www.tudelft.nl/en/about-tu-delft/contact-and-campus"
                target="_blank"
                rel="noreferrer"
              >
                {t("Contact and accessibility")}
              </a>
            </div>
          </div>

          <div>{/* Space for links. */}</div>
        </div>
      </footer>
    </>
  );
}
