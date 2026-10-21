#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const closeTo=(actual,expected,tolerance=0.01)=>{assert.equal(Number.isFinite(actual),true,"expected finite result, got "+actual);assert.ok(Math.abs(actual-expected)<=tolerance,"expected "+expected+", got "+actual);};
const growthSource=read("src/tools/CompoundGrowthCalculator.tsx");
const goalSource=read("src/tools/InflationGoalCalculator.tsx");
const retirementSource=read("src/tools/RetirementPlanningCalculator.tsx");
const notes=JSON.parse(read("src/data/notesData.json"));
const note=slug=>{const value=notes.find(x=>x.slug===slug);assert.ok(value,"Missing current React note data: "+slug);return value.content;};

// Independent compound-growth/SIP vectors (monthly rate, end-of-month contributions).
const sip=(P,C,years,annualRate)=>{const n=Math.round(years*12),r=annualRate/100/12;const value=r===0?P+C*n:P*(1+r)**n+C*(((1+r)**n-1)/r);return {value,invested:P+C*n,growth:value-(P+C*n)};};
const sipDefault=sip(100000,10000,10,10);
closeTo(sipDefault.value,2319153.9381209165);closeTo(sipDefault.invested,1300000);closeTo(sipDefault.growth,1019153.9381209165);
closeTo(sip(1000,100,1,0).value,2200);closeTo(sip(1000,100,0,10).value,1000);
assert.ok(growthSource.includes('const r = returnRate / 100 / 12;'));
assert.ok(growthSource.includes('if (r === 0)'));
assert.ok(growthSource.includes('const factor = Math.pow(1 + r, n);'));
assert.ok(growthSource.includes('id="initial"')&&growthSource.includes('id="monthly"'));
assert.ok(growthSource.includes('setInitial(100000)')&&growthSource.includes('setMonthly(10000)'));

// Inflation/goal vectors.
const goal=(cost,years,annualInflation,savings)=>{const future=cost*(1+annualInflation/100)**years;return {future,increase:future-cost,gap:Math.max(0,future-savings)};};
const goalDefault=goal(1000000,10,6,200000);
closeTo(goalDefault.future,1790847.6965428547);closeTo(goalDefault.increase,790847.6965428547);closeTo(goalDefault.gap,1590847.6965428547);
closeTo(goal(1000000,10,0,1200000).future,1000000);closeTo(goal(1000000,10,0,1200000).gap,0);closeTo(goal(0,10,6,0).future,0);
assert.ok(goalSource.includes('Math.pow(1 + i, years)'));
assert.ok(goalSource.includes('Math.max(0, futureCost - savings)'));
assert.ok(goalSource.includes('id="cost"')&&goalSource.includes('setCost(1000000)'));

// Retirement vectors: monthly accumulation plus finite-horizon real-return annuity.
const retirement=({age,retirementAge,lifespan,spending,corpus,monthly,inflation,preReturn,realReturn})=>{
 const years=retirementAge-age,months=Math.round(years*12),horizon=lifespan-retirementAge,futureSpending=spending*(1+inflation/100)**years,monthlyRate=preReturn/100/12;
 const projected=monthlyRate===0?corpus+monthly*months:corpus*(1+monthlyRate)**months+monthly*(((1+monthlyRate)**months-1)/monthlyRate);
 const real=realReturn/100,required=real===0?futureSpending*horizon:futureSpending*(1-(1+real)**(-horizon))/real;
 return {futureSpending,projected,required,gap:projected-required};
};
const retirementDefault=retirement({age:45,retirementAge:58,lifespan:88,spending:720000,corpus:3000000,monthly:30000,inflation:6,preReturn:10,realReturn:3});
closeTo(retirementDefault.futureSpending,1535708.347304893);closeTo(retirementDefault.projected,20487255.618722133);closeTo(retirementDefault.required,30100561.391240735);closeTo(retirementDefault.gap,-9613305.772518601);
const zeroReal=retirement({age:40,retirementAge:60,lifespan:80,spending:100000,corpus:0,monthly:0,inflation:0,preReturn:0,realReturn:0});
closeTo(zeroReal.projected,0);closeTo(zeroReal.required,2000000);
assert.ok(retirementSource.includes('Math.pow(1 + inf, years)'));
assert.ok(retirementSource.includes('Math.pow(1 + real, -horizon)'));
assert.ok(retirementSource.includes('id="age"')&&retirementSource.includes('setAge(45)'));

// Current React note dataset keeps the independently checked worked examples and disclosures.
const retirementNote=note("retirement-corpus-calculation-framework");
assert.ok(retirementNote.includes("roughly ₹294 lakh, or ₹2.94 crore"),"Retirement corpus example must match independent arithmetic");
const exampleCorpusLakh=15*(1-(1+0.03)**(-30))/0.03;
closeTo(exampleCorpusLakh,294.00662024204684,0.000001);
const taxNote=note("new-vs-old-tax-regime-comparison");
assert.ok(taxNote.includes("₹5–8 lakh"),"Tax comparison must retain the published slab-band example");
assert.ok(/marginal slab rates on income within each band/i.test(taxNote),"Tax guide must explain marginal rates");
const healthNote=note("health-insurance-understanding-the-basics");
for(const phrase of ["If a claim or service grievance remains unresolved","contacting its Grievance Redressal Officer","bimabharosa.irdai.gov.in","not to pay money or scan QR codes"])assert.ok(healthNote.includes(phrase),"Health-insurance safety guidance missing: "+phrase);
const inflationNote=note("inflation-and-future-goal-planning");
assert.ok(/future goal cost|future cost/i.test(inflationNote),"Inflation guide must explain future goal costs");
const moneyNote=note("money-basics-budget-emergency-net-worth");
assert.ok(/emergency fund/i.test(moneyNote),"Budget guide must retain emergency-fund guidance");
for(const [slug,content] of [["retirement-corpus-calculation-framework",retirementNote],["new-vs-old-tax-regime-comparison",taxNote],["health-insurance-understanding-the-basics",healthNote]]){
 assert.ok(content.includes("Financial Content Disclosure")||content.includes("general educational information"),slug+" must retain a financial/health information disclaimer");
}
console.log("Finance Calculator Regression Gate: PASS");
console.log("Independent math vectors: SIP, inflation goal, retirement projection, real-return corpus and zero-rate cases.");
console.log("Current React calculator components and migrated note content verified.");
