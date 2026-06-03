import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About | Van-Nhan Nguyen",
  description: "About the photographer, gear setup, and portfolio introduction.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 md:py-12 px-6 md:px-12 animate-slide-up">
      <h1 className="font-serif text-3xl md:text-4xl italic font-semibold mb-8 tracking-wide text-text-main">
        Maryland based photographer Van-Nhan Nguyen
      </h1>

      <div className="flow-root text-sm text-text-muted leading-relaxed font-medium mb-8">
        <div className="relative w-48 h-48 border border-line-light float-left mr-6 mb-4 shadow-sm">
          <Image
            src="/profile.jpg"
            alt="Van-Nhan Nguyen"
            fill
            sizes="192px"
            className="object-cover"
            priority
          />
        </div>
        <p className="mb-4">
          picked up photography in 2019 with his sister&apos;s old Olympus PEN E-PL6 after wanting a more tactial and
          true-to-life picture taking experience. Since then, Van has been photographing everything he can from landscape and portrait to event and toy photography. He has also stuck with the relatively niche Micro Four Thirds mount, eventually graduating to a Olympus OM-D E-M1 Mark II with several prime and zoom lenses.
        </p>
        <p>
          Outside of photography, Van is a software engineer by day and spends his free time building Gundam model kits, playing video games with a particular bias towards Nintendo, and hanging out with family and friends.
        </p>
      </div>

      <div className="mt-8 border-t border-line-light/50 pt-8">
      <h2 className="font-serif text-4xl md:text-4xl italic font-semibold mb-8 tracking-wide text-text-main">
        Setup and Gear
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

          <div>
            <h3 className="text-[10px] tracking-widest font-bold text-text-light uppercase mb-4">
              Other Gear
            </h3>
            <ul className="flex flex-col gap-3 text-xs font-medium text-text-main">
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>K&F Concept Variable ND Filter</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>K&F Concept 75&quot; Camera Tripod</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>Manfrotto Mini Travel Tripod</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-light shrink-0 self-center" />
                <span>K&F Concept Photo Studio Light Box</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
