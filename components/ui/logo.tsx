import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/logomark.svg";

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 32, height = 32 }: LogoProps) {
  return (
    <Link href="/" className="inline-flex shrink-0" aria-label="Treza">
      <Image src={logo} alt="Treza Labs" width={width} height={height} />
    </Link>
  );
}
