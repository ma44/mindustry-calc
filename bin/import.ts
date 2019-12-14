import got from "got";
import { writeFileSync } from "fs";

// Dont try this at home kids.

(async () => {
  try {
    await importBlocks();
    // await importItems();
    // await importLiquids();
  } catch (error) {
    throw error.response.body;
  }
})();

async function importBlocks() {
  const response = await got(
    "https://raw.githubusercontent.com/Anuken/Mindustry/master/core/src/io/anuke/mindustry/content/Blocks.java"
  );

  let out = 'import {Item} from "./item";\n';
  out += 'import Items from "./Items";\n';
  out += 'import GenericCrafter from "./GenericCrafter";\n';
  out += 'import GenericSmelter from "./GenericSmelter";\n';
  out += 'import LiquidConverter from "./GenericSmelter";\n';
  out += 'import Separator from "./GenericSmelter";\n';
  out += 'import ItemStack from "./ItemStack";\n';
  out += 'import Liquids from "./Liquids";\n';
  out += 'import LiquidStack from "./LiquidStack";\n';

  out += "export default {\n";

  for (const item of response.body.matchAll(
    / (\w+) = new (GenericCrafter|GenericSmelter|LiquidConverter|Separator)\((.*?)\){{((.|\n)*?)}}/g
  )) {
    const body = jsify(item[4]);

    out += `${item[1]}: new ${item[2]}(${item[3]}, { ${body} }),`;
  }

  out += "};\n";

  writeFileSync("src/game/Blocks.ts", out);
}

function jsify(input: string): string {
  return input
    .replace(/\w+ = .* ->(.|\n)*};/g, "")
    .replace(/^\s+int.*;/gm, "")
    .replace(/^\s*for\((.|\n)*?}/gm, "")
    .replace(
      /(\w+ = ){2,}(.*);/,
      (s, _, v) =>
        s
          .split(" = ")
          .slice(0, -1)
          .join(`: ${v},`) + `: ${v},`
    )
    .replace("hasPower = hasLiquids = true", "hasPower: true, hasLiquids: true")
    .replace("hasLiquids = hasPower = true", "hasPower: true, hasLiquids: true")
    .replace("hasItems = hasPower = true", "hasItems: true, hasPower: true")
    .replace(
      /^\s*([\w.]+)\((.*)\);/gm,
      (_, name, args) =>
        `\n${name.replace(/\.(.)/, (_, next) =>
          next.toUpperCase()
        )} = [${args}],\n`
    )
    .replace(/ =/g, ":")
    .replace(/Color.valueOf\("(.*?)"\)(\.a\(.*\))?/g, (s, a) => `"#${a}"`)
    .replace(
      /\b(ItemType|Category|Fx|StatusEffects|Color)\.(\w*)/g,
      (s, c, value) => `"${value}"`
    )
    .replace(/;$/gm, ",")
    .replace(/([\d.]+)f/g, (s, a) => a);
}

async function importItems() {
  const response = await got(
    "https://raw.githubusercontent.com/Anuken/Mindustry/master/core/src/io/anuke/mindustry/content/Items.java"
  );

  let out = 'import {Item} from "./item";\n\n';
  out += "export default {\n";
  const items = response.body.matchAll(
    / (\w+) = new Item\((.*?),\s*Color.valueOf\("(.*?")\)\){{((.|\n)*?)}};/g
  );

  for (const item of items) {
    const body = jsify(item[4]);

    out += `${item[1]}: new Item(${item[2]}, "#${item[3]}, { ${body} }),`;
  }
  out += "};\n";

  writeFileSync("src/game/Items.ts", out);
}

async function importLiquids() {
  const response = await got(
    "https://raw.githubusercontent.com/Anuken/Mindustry/master/core/src/io/anuke/mindustry/content/Liquids.java"
  );

  let out = 'import Liquid from "./Liquid";\n\n';
  out += "export default {\n";
  const items = response.body.matchAll(
    / (\w+) = new Liquid\((.*?),\s*Color.valueOf\("(.*?")\)\){{((.|\n)*?)}};/g
  );

  for (const item of items) {
    const body = jsify(item[4]);

    out += `${item[1]}: new Liquid(${item[2]}, "#${item[3]}, { ${body} }),`;
  }
  out += "};\n";

  writeFileSync("src/game/Liquids.ts", out);
}