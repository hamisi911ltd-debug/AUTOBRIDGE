// Real manufacturer badges sourced from Wikimedia Commons (the actual
// official logo artwork, not a simplified single-colour glyph) for every
// make that currently appears in inventory; Simple Icons CDN fills in the
// long tail of makes that don't. Unmapped makes fall back to an
// initial-letter badge below. Shared between the homepage's browse tiles
// and the filter sidebar so both show the same logos.
export const MAKE_LOGO: Record<string, string> = {
  Toyota: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Toyota_logo_%28Red%29.svg/330px-Toyota_logo_%28Red%29.svg.png",
  Honda: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/330px-Honda_Logo.svg.png",
  Nissan: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Nissan_2020_logo.svg/330px-Nissan_2020_logo.svg.png",
  Mazda: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Mazda_logo_with_emblem%2C_new.svg/330px-Mazda_logo_with_emblem%2C_new.svg.png",
  Subaru: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Subaru_logo.svg/330px-Subaru_logo.svg.png",
  BMW: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/330px-BMW.svg.png",
  Kia: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/KIA_logo3.svg/330px-KIA_logo3.svg.png",
  Suzuki: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Suzuki_Motor_Corporation_logo.svg/330px-Suzuki_Motor_Corporation_logo.svg.png",
  "Mercedes-Benz": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Mercedes-Benz_Logo_2010.svg/250px-Mercedes-Benz_Logo_2010.svg.png",
  Mitsubishi: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mitsubishi_logo.svg/330px-Mitsubishi_logo.svg.png",
  Isuzu: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Isuzu.svg/330px-Isuzu.svg.png",
  Daihatsu: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Daihatsu_Logo.svg/330px-Daihatsu_Logo.svg.png",
  Hino: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Hino_Motors_logo.svg/330px-Hino_Motors_logo.svg.png",
  Lexus: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Lexus.svg/330px-Lexus.svg.png",
  "Land Rover": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Land_Rover_2023.svg/330px-Land_Rover_2023.svg.png",
  Jaguar: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Jaguar_1966_logo.svg/330px-Jaguar_1966_logo.svg.png",
  Ford: "https://cdn.simpleicons.org/ford",
  Volkswagen: "https://cdn.simpleicons.org/volkswagen",
  Audi: "https://cdn.simpleicons.org/audi",
  Peugeot: "https://cdn.simpleicons.org/peugeot",
  Jeep: "https://cdn.simpleicons.org/jeep",
  Hyundai: "https://cdn.simpleicons.org/hyundai",
  Chevrolet: "https://cdn.simpleicons.org/chevrolet",
  Volvo: "https://cdn.simpleicons.org/volvo",
};

// Real flag images (flagcdn.com) instead of emoji — flag emoji glyphs
// silently fall back to plain two-letter text on systems without a
// colour-emoji font (common on Windows Server / some browsers), so an actual
// image renders consistently everywhere instead of leaving it to chance.
export const COUNTRY_ISO: Record<string, string> = {
  Japan: "jp",
  UAE: "ae",
  UK: "gb",
  USA: "us",
  "South Korea": "kr",
};
