import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Van-Nhan Nguyen",
  description: "About the photographer, gear setup, and portfolio introduction.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-6 md:px-12 animate-slide-up">
      <h1 className="font-serif text-3xl md:text-4xl italic font-semibold mb-8 tracking-wide text-text-main">
        About
      </h1>

      <div className="flex flex-col gap-4 text-sm text-text-muted leading-relaxed font-medium">
        <p>
          Hey there, I&apos;m Van! I&apos;m an amateur photographer based in the greater Washington, DC area. While pretty niche,
          I shoot on the Micro Four Thirds (M43) mount with my Olympus OM-D E-M1 Mark II.
        </p>
        <p>
          I&apos;m interested in all types of photography, from your usual travel, landscapes and portraits to street, event and toy photography.
        </p>
      </div>

      <div className="mt-8 border-t border-line-light/50 pt-8">
      <h2 className="font-serif text-xl md:text-4xl italic font-semibold mb-8 tracking-wide text-text-main">
        Gear and Setup
      </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-[10px] tracking-widest font-bold text-text-light uppercase mb-4">
              Camera Bodies
            </h3>
            <ul className="flex flex-col gap-4 text-xs font-medium">
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <div>
                  <span className="text-text-main font-semibold">Olympus OM-D E-M1 Mark II</span>
                  <span className="block text-[10px] text-text-light uppercase mt-0.5">Primary Body</span>
                </div>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <div>
                  <span className="text-text-main font-semibold">Olympus Pen E-PL6</span>
                  <span className="block text-[10px] text-text-light uppercase mt-0.5">Where it all started</span>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] tracking-widest font-bold text-text-light uppercase mb-4">
              Lenses
            </h3>
            <ul className="flex flex-col gap-3 text-xs font-medium text-text-main">
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>OM Systems 12-40mm f/2.8 PRO</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>Lumix 35-100mm f2.8</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>Olympus 45mm f/1.8</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>Olympus 25mm f/1.8</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>TTArtisans 50mm f/1.2</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
