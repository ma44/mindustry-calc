import { flattenInputs, Link, ProductionNode, solve, Template } from "./solver";
import * as util from "util";

const recipes: { [name: string]: Template } = {
  flour: { inputs: [], outputs: [{ item: "flour", count: 1 }] },
  advancedFlour: {
    inputs: [{ item: "water", count: 1 }],
    outputs: [{ item: "flour", count: 5 }],
  },
  water: { inputs: [], outputs: [{ item: "water", count: 1 }] },
  sugar: { inputs: [], outputs: [{ item: "sugar", count: 1 }] },
  bread: {
    inputs: [
      { item: "water", count: 2 },
      { item: "flour", count: 3 },
    ],
    outputs: [{ item: "bread", count: 1 }],
  },
  sweetBread: {
    inputs: [
      { item: "water", count: 1 },
      { item: "flour", count: 1 },
      { item: "sugar", count: 1 },
    ],
    outputs: [{ item: "bread", count: 2 }],
  },
  positiveFeedbackLoop: {
    inputs: [{ item: "slime", count: 1 }],
    outputs: [{ item: "slime", count: 2 }],
  },
};

const allRecipes = Object.values(recipes);

test("solve", () => {
  // add test for unproduceable items

  const results = solve(allRecipes, { item: "bread", count: 2 });
  expect(util.inspect(Array.from(results))).toEqual(`[
  1 'water' + 1 'flour' + 1 'sugar' -> 2 'bread'
    none -> 1 'sugar'
    none -> 1 'flour'
    none -> 1 'water'
  ,
  1 'water' + 1 'flour' + 1 'sugar' -> 2 'bread'
    none -> 1 'sugar'
    0.2 'water' -> 1 'flour'
    none -> 1 'water' + 0.2 'water'
  ,
  4 'water' + 6 'flour' -> 2 'bread'
    none -> 6 'flour'
    none -> 4 'water'
  ,
  4 'water' + 6 'flour' -> 2 'bread'
    1.2 'water' -> 6 'flour'
    none -> 4 'water' + 1.2 'water'
  
]`);
});

test("solve infinite loop", () => {
  const results = solve(allRecipes, { item: "slime", count: 2 });

  expect(util.inspect(Array.from(results)[0])).toEqual(
    "2 'slime' -> 2 'slime' + 2 'slime'\n",
  );
});

describe("ProductionNode", () => {
  it("can calculate required input amounts", () => {
    const node = new ProductionNode(recipes["bread"]);
    node.linkTo({ item: "bread", count: 10 });

    expect(node.requiredInputAmount("flour")).toBe(30);
    expect(node.requiredInputAmount("water")).toBe(20);
  });

  it("will request enough materials for all links", () => {
    const node = new ProductionNode(recipes["bread"]);
    node.linkTo({ item: "bread", count: 10 });
    node.linkTo({ item: "bread", count: 5 });

    expect(node.requiredInputAmount("flour")).toBe(45);
    expect(node.requiredInputAmount("water")).toBe(30);
  });
});

test("flattenInputs", () => {
  const i1m1: Template = { outputs: [], inputs: [] };
  const i1m2: Template = { outputs: [], inputs: [] };
  const i2m1: Template = { outputs: [], inputs: [] };
  const i2m2: Template = { outputs: [], inputs: [] };
  const i3m1: Template = { outputs: [], inputs: [] };

  const out = flattenInputs([[i1m1, i1m2], [i2m1, i2m2], [i3m1]]);
  expect(out).toEqual([
    [i1m1, i2m1, i3m1],
    [i1m1, i2m2, i3m1],
    [i1m2, i2m1, i3m1],
    [i1m2, i2m2, i3m1],
  ]);
});

test("clone incomplete", () => {
  const bread = new ProductionNode(recipes["bread"]);
  bread.linkTo({ item: "bread", count: 2 });

  const [newBread] = ProductionNode.clone([bread]);
  expect(util.inspect(bread)).toEqual(util.inspect(newBread));
});

test("clone", () => {
  const bread = new ProductionNode(recipes["bread"]);
  bread.linkTo({ item: "bread", count: 2 });
  const water = new ProductionNode(recipes["water"]);
  water.linkTo({ item: "water", count: 4 }, bread);
  const flour = new ProductionNode(recipes["flour"]);
  flour.linkTo({ item: "flour", count: 6 }, bread);

  const [newBread, newFlour, newWater] = ProductionNode.clone([
    bread,
    flour,
    water,
  ]);

  expect(newBread.outputs[0].required).toEqual({
    item: "bread",
    count: 2,
  });

  expect(newBread.inputs[0].required).toEqual({
    item: "water",
    count: 4,
  });

  expect(newBread.inputs[1].required).toEqual({
    item: "flour",
    count: 6,
  });

  expect(newFlour.outputs[0].required).toEqual({
    item: "flour",
    count: 6,
  });
  expect(newWater.outputs[0].required).toEqual({
    item: "water",
    count: 4,
  });

  expect(newBread.template).toBe(recipes["bread"]);
  expect(newBread.inputs[0].source.template).toBe(recipes["water"]);

  expect(newBread.inputs[1].source.template).toBe(recipes["flour"]);
  expect(newBread.inputs[0].source.outputs[0].destination.template).toBe(
    recipes["bread"],
  );
  expect(newBread.inputs[1].source.outputs[0].destination.template).toBe(
    recipes["bread"],
  );

  expect(newBread).not.toBe(bread);
});
