import { getTranslations } from "next-intl/server";
import { SocialIcon } from "react-social-icons";

import "react-social-icons/twitter";

export async function GlobalFooter() {
  const t = await getTranslations();

  return (
    <footer className="mt-8 w-full bg-[#1D1F71] p-8 text-white">
      <div className="mx-auto flex max-w-screen-xl flex-col justify-between sm:flex-row ">
        <div>
          <h2 className="mb-12 max-w-96 font-sans text-4xl">{t("Delft University of Technology")}</h2>
          <div className="mb-8 flex gap-2 max-sm:flex-wrap max-sm:gap-1">
            <div>
              <SocialIcon url="https://www.facebook.com/tudelft" bgColor="#fff" color="#000" fgColor="#1D1F71" />
            </div>
            <div>
              <SocialIcon network="x" url="https://twitter.com/tudelft" bgColor="#fff" color="#000" fgColor="#1D1F71" />
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
            <div>The Netherlands</div>
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
  );
}
