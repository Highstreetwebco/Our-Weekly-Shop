import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const C = {
  ink: "#1C2B24",
  muted: "#66736D",
  green: "#1E4A37",
  greenDark: "#143225",
  greenSoft: "#E4EEE7",
  cream: "#F8F4EA",
  white: "#FFFDF8",
  gold: "#B38A42",
  goldSoft: "#F1E6D2",
  line: "#DDD8CB",
  red: "#A64E48",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TAB_ITEMS = [
  ["Home", "chatbubble-ellipses-outline"],
  ["Week", "calendar-outline"],
  ["Shop", "basket-outline"],
  ["More", "ellipsis-horizontal-circle-outline"],
];

const SEED_RECIPES = {
  "Chilli con carne": {
    emoji: "🌶️",
    servings: 4,
    prepMinutes: 35,
    ingredients: [
      { name: "Beef mince", quantity: 500, unit: "g" },
      { name: "Kidney beans", quantity: 1, unit: "tin" },
      { name: "Chopped tomatoes", quantity: 1, unit: "tin" },
      { name: "Rice", quantity: 300, unit: "g" },
    ],
  },
  "Chicken burritos": {
    emoji: "🌯",
    servings: 4,
    prepMinutes: 30,
    ingredients: [
      { name: "Chicken breast", quantity: 500, unit: "g" },
      { name: "Wraps", quantity: 8, unit: "items" },
      { name: "Mexican rice", quantity: 1, unit: "pouch" },
      { name: "Cheddar", quantity: 200, unit: "g" },
    ],
  },
  "Sausage pasta bake": {
    emoji: "🍝",
    servings: 4,
    prepMinutes: 40,
    ingredients: [
      { name: "Sausages", quantity: 8, unit: "items" },
      { name: "Pasta", quantity: 500, unit: "g" },
      { name: "Pasta sauce", quantity: 1, unit: "jar" },
      { name: "Mozzarella", quantity: 200, unit: "g" },
    ],
  },
  "Pizza night": {
    emoji: "🍕",
    servings: 4,
    prepMinutes: 20,
    ingredients: [
      { name: "Frozen pizza", quantity: 2, unit: "items" },
      { name: "Garlic bread", quantity: 1, unit: "pack" },
    ],
  },
  "Chicken burgers": {
    emoji: "🍔",
    servings: 4,
    prepMinutes: 25,
    ingredients: [
      { name: "Chicken burgers", quantity: 4, unit: "items" },
      { name: "Burger buns", quantity: 4, unit: "items" },
      { name: "Oven chips", quantity: 1, unit: "bag" },
    ],
  },
  "Jacket potatoes": {
    emoji: "🥔",
    servings: 4,
    prepMinutes: 60,
    ingredients: [
      { name: "Baking potatoes", quantity: 4, unit: "items" },
      { name: "Tuna", quantity: 2, unit: "tins" },
      { name: "Cheddar", quantity: 200, unit: "g" },
    ],
  },
  "Salmon & broccoli": {
    emoji: "🐟",
    servings: 2,
    prepMinutes: 25,
    ingredients: [
      { name: "Salmon fillets", quantity: 2, unit: "items" },
      { name: "Broccoli", quantity: 1, unit: "head" },
      { name: "New potatoes", quantity: 500, unit: "g" },
    ],
  },
  Waffles: {
    emoji: "🧇",
    servings: 4,
    prepMinutes: 10,
    ingredients: [
      { name: "Waffles", quantity: 8, unit: "items" },
      { name: "Baked beans", quantity: 1, unit: "tin" },
    ],
  },
};

const ALIASES = {
  chilli: "Chilli con carne",
  "chilli con carne": "Chilli con carne",
  burritos: "Chicken burritos",
  burrito: "Chicken burritos",
  "pasta bake": "Sausage pasta bake",
  "sausage pasta": "Sausage pasta bake",
  pizza: "Pizza night",
  burgers: "Chicken burgers",
  "jacket potatoes": "Jacket potatoes",
  jackets: "Jacket potatoes",
  salmon: "Salmon & broccoli",
  waffles: "Waffles",
};

const CHEAPER_SUGGESTIONS = {
  "Cheddar": "Mature cheddar own-brand block",
  "Chicken breast": "Own-brand chicken breast",
  "Frozen pizza": "Own-brand frozen pizza",
  "Coffee": "Own-brand ground coffee",
  "Baked beans": "Own-brand baked beans",
};

function blankPlan() {
  return Object.fromEntries(DAYS.map((day) => [day, []]));
}

function weekStart() {
  const value = new Date();
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value.toISOString().slice(0, 10);
}

function displayQuantity(quantity, unit) {
  const rounded = Math.round(quantity * 10) / 10;
  return String(rounded) + " " + unit;
}

function findRecipeName(text, recipes) {
  const lower = text.toLowerCase();
  const names = Object.keys(recipes);
  const direct = names.find((name) => lower.includes(name.toLowerCase()));
  if (direct) return direct;
  const alias = Object.keys(ALIASES).find((key) => lower.includes(key));
  return alias ? ALIASES[alias] : null;
}

function matchingPeople(text, people) {
  const lower = text.toLowerCase();
  const named = people.filter((person) => lower.includes(String(person.name).toLowerCase()));
  if (named.length) return named;
  if (lower.includes("kids") || lower.includes("children")) {
    const children = people.filter((person) => person.role === "Child");
    if (children.length) return children;
  }
  if (lower.includes("me") && people.length) return people.filter((person) => person.role !== "Child").slice(0, 1);
  return people;
}

function mealAssignmentsFromText(text, recipeName, people) {
  const lower = text.toLowerCase();
  const childRecipe = findRecipeName(
    lower.includes("kids") || lower.includes("children") ? text.replace(/salmon|chilli|burritos|pizza/gi, "") : "",
    SEED_RECIPES,
  );
  const adultPeople = people.filter((person) => person.role !== "Child");
  const childPeople = people.filter((person) => person.role === "Child");
  const assignments = [];
  if (childRecipe && childPeople.length && recipeName && childRecipe !== recipeName) {
    assignments.push({ meal: recipeName, peopleIds: (adultPeople.length ? adultPeople : people).map((person) => person.id), portions: adultPeople.length || 1, leftovers: lower.includes("leftover") ? 2 : 0 });
    assignments.push({ meal: childRecipe, peopleIds: childPeople.map((person) => person.id), portions: childPeople.length, leftovers: 0 });
  } else {
    const selected = matchingPeople(text, people);
    assignments.push({ meal: recipeName, peopleIds: selected.map((person) => person.id), portions: selected.length || 1, leftovers: lower.includes("leftover") ? 2 : 0 });
  }
  return assignments;
}

function parseMessage(text, people, recipes) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return { type: "question", message: "Tell me what you would like to add." };

  if (/(always buy|only buy|never substitute|don't substitute)/.test(lower)) {
    const match = trimmed.match(/(?:always buy|only buy|never substitute|don't substitute)\s+(.+)/i);
    return { type: "brand_rule", value: match ? match[1].replace(/[.!?]+$/, "") : trimmed };
  }

  if (/(at home|already have|we have|in the cupboard)/.test(lower)) {
    const match = trimmed.match(/(?:at home|already have|we have|in the cupboard)\s+(.+)/i);
    const value = match ? match[1].replace(/[.!?]+$/, "") : trimmed;
    return { type: "inventory", value };
  }

  if (/^(add|put|include)\b/.test(lower) && !DAYS.some((day) => lower.includes(day.toLowerCase()))) {
    return { type: "extra", value: trimmed.replace(/^(add|put|include)\s+/i, "").replace(/\s+(to|in)\s+(my|the)\s+(shop|basket).*$/i, "") };
  }

  const days = DAYS.filter((day) => lower.includes(day.toLowerCase()));
  const recipeName = findRecipeName(trimmed, recipes);
  if (!days.length) {
    if (recipeName) return { type: "question", message: "Which day should I put " + recipeName + " on?" };
    return { type: "question", message: "I can sort that. Tell me the day as well, for example: “Put chilli on Thursday for me and Gemma.”" };
  }
  if (!recipeName) {
    return { type: "new_recipe", days, value: trimmed };
  }
  return {
    type: "plan_meal",
    days,
    meal: recipeName,
    assignments: mealAssignmentsFromText(trimmed, recipeName, people),
    summary: recipeName + " on " + days.join(" and "),
  };
}

function calculateBasket(plan, recipes, inventory, extras) {
  const totals = {};
  Object.keys(plan).forEach((day) => {
    plan[day].forEach((assignment) => {
      const recipe = recipes[assignment.meal];
      if (!recipe) return;
      const factor = Math.max(1, (assignment.portions + (assignment.leftovers || 0)) / recipe.servings);
      recipe.ingredients.forEach((ingredient) => {
        const key = ingredient.name.toLowerCase() + "|" + ingredient.unit;
        if (!totals[key]) totals[key] = { name: ingredient.name, unit: ingredient.unit, quantity: 0, source: [], originalQuantity: 0 };
        totals[key].quantity += ingredient.quantity * factor;
        totals[key].originalQuantity += ingredient.quantity * factor;
        if (!totals[key].source.includes(day)) totals[key].source.push(day);
      });
    });
  });
  Object.values(totals).forEach((line) => {
    const stock = inventory.find((item) => item.name.toLowerCase() === line.name.toLowerCase());
    line.inStock = stock ? Number(stock.quantity || 0) : 0;
    line.quantity = Math.max(0, line.quantity - line.inStock);
  });
  const lines = Object.values(totals).filter((line) => line.quantity > 0.01);
  extras.forEach((name) => lines.push({ name, unit: "item", quantity: 1, source: ["Added by you"], originalQuantity: 1, inStock: 0 }));
  return lines;
}

export default function ConversationalWeeklyShop() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [household, setHousehold] = useState(null);
  const [people, setPeople] = useState([]);
  const [recipes, setRecipes] = useState(SEED_RECIPES);
  const [plan, setPlan] = useState(blankPlan());
  const [inventory, setInventory] = useState([]);
  const [extras, setExtras] = useState([]);
  const [brandRules, setBrandRules] = useState([]);
  const [budget, setBudget] = useState("");
  const [tab, setTab] = useState("Home");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Tell me about your week. I’ll turn it into a shop you can check and approve." }]);
  const [proposal, setProposal] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Not connected");
  const [voiceListening, setVoiceListening] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    bootstrap(session.user).catch(() => {
      setSaveStatus("Could not load saved data");
      setLoading(false);
    });
  }, [session?.user?.id]);

  async function bootstrap(user) {
    setLoading(true);
    setSaveStatus("Loading your shop…");
    let membership = (await supabase.from("household_members").select("household_id").eq("user_id", user.id).limit(1).maybeSingle()).data;
    let householdId = membership?.household_id;
    if (!householdId) {
      const created = await supabase.from("households").insert({ name: (user.email || "Our") + " household", created_by: user.id }).select().single();
      if (created.error) throw created.error;
      householdId = created.data.id;
      await supabase.from("household_members").insert({ household_id: householdId, user_id: user.id, role: "owner" });
    }
    const householdResult = await supabase.from("households").select("*").eq("id", householdId).single();
    setHousehold(householdResult.data || { id: householdId, name: "Our household" });

    const [peopleResult, mealsResult, inventoryResult, profileResult] = await Promise.all([
      supabase.from("household_people").select("*").eq("household_id", householdId).order("created_at"),
      supabase.from("meals").select("*, meal_ingredients(*, ingredients(name))").eq("household_id", householdId).order("created_at"),
      supabase.from("inventory_items").select("*").eq("household_id", householdId).order("use_by_date"),
      supabase.from("profiles").select("app_state, setup_complete").eq("id", user.id).maybeSingle(),
    ]);
    const nextPeople = peopleResult.data || [];
    setPeople(nextPeople);
    if (mealsResult.data?.length) {
      const custom = { ...SEED_RECIPES };
      mealsResult.data.forEach((meal) => {
        custom[meal.name] = {
          emoji: meal.emoji || "🍽️",
          servings: meal.default_portions || meal.servings || 2,
          prepMinutes: meal.prep_minutes || 30,
          ingredients: (meal.meal_ingredients || []).map((item) => ({ name: item.ingredients?.name || item.preferred_product_name || "Ingredient", quantity: Number(item.quantity || 1), unit: item.unit || "item" })),
        };
      });
      setRecipes(custom);
    }
    setInventory((inventoryResult.data || []).map((item) => ({ name: item.name, quantity: Number(item.estimated_quantity || 0), useBy: item.use_by_date })));
    const saved = profileResult.data?.app_state || {};
    if (saved.plan) setPlan(saved.plan);
    if (saved.extras) setExtras(saved.extras);
    if (saved.brandRules) setBrandRules(saved.brandRules);
    if (saved.budget) setBudget(String(saved.budget));
    setSetupComplete(Boolean(profileResult.data?.setup_complete));
    setSaveStatus("Saved securely");
    setLoading(false);
  }

  async function saveSnapshot(nextPlan, nextExtras, nextInventory, nextBrandRules, nextBudget) {
    if (!session?.user?.id || !household?.id) return;
    setSaveStatus("Saving…");
    const state = { plan: nextPlan, extras: nextExtras, inventory: nextInventory, brandRules: nextBrandRules, budget: nextBudget };
    const result = await supabase.from("profiles").upsert({ id: session.user.id, display_name: household.name, app_state: state, setup_complete: setupComplete, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaveStatus(result.error ? "Saved on this device" : "Saved securely");
  }

  async function saveAiAction(action, status, payload) {
    if (!session?.user?.id || !household?.id) return;
    await supabase.from("ai_actions").insert({ household_id: household.id, user_id: session.user.id, week_start: weekStart(), input_text: action.input, input_mode: action.inputMode || "text", intent: action.type, proposed_changes: payload || {}, status });
  }

  async function saveStructuredPlan(nextPlan) {
    if (!household?.id) return;
    const planResult = await supabase.from("weekly_plans").upsert({ household_id: household.id, week_start: weekStart() }, { onConflict: "household_id,week_start" }).select().single();
    if (planResult.error || !planResult.data) return;
    const weeklyPlanId = planResult.data.id;
    await supabase.from("planned_meals").delete().eq("weekly_plan_id", weeklyPlanId);
    for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
      const day = DAYS[dayIndex];
      for (const assignment of nextPlan[day] || []) {
        let mealResult = await supabase.from("meals").select("id").eq("household_id", household.id).eq("name", assignment.meal).maybeSingle();
        let mealId = mealResult.data?.id;
        const recipe = recipes[assignment.meal];
        if (!mealId) {
          const created = await supabase.from("meals").insert({ household_id: household.id, name: assignment.meal, emoji: recipe?.emoji || "🍽️", default_portions: recipe?.servings || assignment.portions || 2, prep_minutes: recipe?.prepMinutes || 30, source: "conversation" }).select().single();
          mealId = created.data?.id;
          if (mealId && recipe) {
            for (const ingredient of recipe.ingredients) {
              let ingredientResult = await supabase.from("ingredients").select("id").eq("household_id", household.id).eq("name", ingredient.name).maybeSingle();
              let ingredientId = ingredientResult.data?.id;
              if (!ingredientId) ingredientId = (await supabase.from("ingredients").insert({ household_id: household.id, name: ingredient.name }).select().single()).data?.id;
              if (ingredientId) await supabase.from("meal_ingredients").insert({ meal_id: mealId, ingredient_id: ingredientId, quantity: ingredient.quantity, unit: ingredient.unit });
            }
          }
        }
        if (!mealId) continue;
        const createdSlot = await supabase.from("planned_meals").insert({ weekly_plan_id: weeklyPlanId, meal_id: mealId, day_of_week: dayIndex, meal_type: "dinner", portions: Math.max(1, assignment.portions || 1), leftover_portions: assignment.leftovers || 0, source: "conversation" }).select().single();
        if (createdSlot.data?.id && assignment.peopleIds?.length) {
          await supabase.from("planned_meal_people").insert(assignment.peopleIds.map((personId) => ({ planned_meal_id: createdSlot.data.id, person_id: personId })));
        }
      }
    }
  }

  function sendMessage(value, inputMode) {
    const text = (value || input).trim();
    if (!text) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text }]);
    const parsed = parseMessage(text, people, recipes);
    const action = { ...parsed, input: text, inputMode: inputMode || "text" };
    if (parsed.type === "question") {
      setMessages((current) => [...current, { role: "assistant", text: parsed.message }]);
      return;
    }
    if (parsed.type === "new_recipe") {
      const mealName = text.replace(/^(put|add|plan)\s+/i, "").split(/\s+on\s+/i)[0].trim();
      setProposal({ ...action, mealName, changes: { days: parsed.days, meal: mealName, assignments: [{ meal: mealName, peopleIds: people.map((person) => person.id), portions: people.length || 1, leftovers: 0 }] }, summary: "Add a new recipe called “" + mealName + "”" });
      setMessages((current) => [...current, { role: "assistant", text: "I don’t know that meal yet. I’ll save it as a recipe after you confirm, then ask for its ingredients." }]);
      return;
    }
    setProposal(parsed.type === "plan_meal" ? action : { ...action, summary: parsed.type === "extra" ? "Add “" + parsed.value + "” to your shop" : parsed.type === "inventory" ? "Add “" + parsed.value + "” to home stock" : "Save this brand rule" });
    setMessages((current) => [...current, { role: "assistant", text: "Here’s what I understood. Check it before I save anything." }]);
  }

  async function approveProposal() {
    if (!proposal) return;
    let nextPlan = plan;
    let nextExtras = extras;
    let nextInventory = inventory;
    let nextBrandRules = brandRules;
    if (proposal.type === "plan_meal" || proposal.type === "new_recipe") {
      nextPlan = { ...plan };
      proposal.changes.days.forEach((day) => {
        nextPlan[day] = [...(nextPlan[day] || []), ...(proposal.changes.assignments || [])];
      });
      if (proposal.type === "new_recipe" && !recipes[proposal.mealName]) {
        setRecipes((current) => ({ ...current, [proposal.mealName]: { emoji: "🍽️", servings: 2, prepMinutes: 30, ingredients: [] } }));
      }
      setPlan(nextPlan);
      setTab("Week");
      await saveStructuredPlan(nextPlan);
    } else if (proposal.type === "extra") {
      nextExtras = [...new Set([...extras, proposal.value])];
      setExtras(nextExtras);
      setTab("Shop");
    } else if (proposal.type === "inventory") {
      nextInventory = [...inventory.filter((item) => item.name.toLowerCase() !== proposal.value.toLowerCase()), { name: proposal.value, quantity: 1 }];
      setInventory(nextInventory);
      setTab("More");
    } else if (proposal.type === "brand_rule") {
      nextBrandRules = [...new Set([...brandRules, proposal.value])];
      setBrandRules(nextBrandRules);
      setTab("More");
    }
    await saveAiAction(proposal, "approved", proposal.changes || { value: proposal.value });
    await saveSnapshot(nextPlan, nextExtras, nextInventory, nextBrandRules, budget);
    setMessages((current) => [...current, { role: "assistant", text: "Done. I’ve added it to the plan and kept the change explainable." }]);
    setProposal(null);
  }

  async function rejectProposal() {
    if (!proposal) return;
    await saveAiAction(proposal, "rejected", proposal.changes || { value: proposal.value });
    setMessages((current) => [...current, { role: "assistant", text: "No problem — I left your plan unchanged." }]);
    setProposal(null);
  }

  function startVoice() {
    if (typeof window === "undefined") {
      Alert.alert("Voice input", "Voice input is available when you open the web preview in a compatible browser.");
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      Alert.alert("Voice input", "This browser does not provide voice recognition. You can still type naturally.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      setTimeout(() => sendMessage(transcript, "voice"), 0);
    };
    recognition.start();
  }

  async function completeSetup(name, nextPeople) {
    const nextHousehold = { ...household, name };
    setHousehold(nextHousehold);
    setPeople(nextPeople);
    setSetupComplete(true);
    await supabase.from("households").update({ name, adults: nextPeople.filter((person) => person.role !== "Child").length, children: nextPeople.filter((person) => person.role === "Child").length }).eq("id", household.id);
    if (nextPeople.length) {
      const peopleResult = await supabase.from("household_people").insert(nextPeople.map((person) => {
        const { id, ...personWithoutLocalId } = person;
        return { ...personWithoutLocalId, household_id: household.id };
      })).select();
      if (peopleResult.data?.length) {
        setPeople(peopleResult.data);
        nextPeople = peopleResult.data;
      }
    }
    await supabase.from("profiles").upsert({ id: session.user.id, display_name: name, setup_complete: true, app_state: { plan, extras, inventory, brandRules, budget }, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaveStatus("Saved securely");
  }

  const basket = useMemo(() => calculateBasket(plan, recipes, inventory, extras), [plan, recipes, inventory, extras]);
  const plannedDays = DAYS.filter((day) => (plan[day] || []).length).length;

  if (authLoading || loading) return <LoadingScreen text={authLoading ? "Opening Our Weekly Shop…" : "Loading your household…"} />;
  if (!session) return <AuthScreen onSession={setSession} />;
  if (!setupComplete) return <SetupScreen household={household} onComplete={completeSetup} />;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View><Text style={styles.kicker}>OUR WEEKLY SHOP</Text><Text style={styles.greeting}>Let’s sort the week.</Text></View>
            <TouchableOpacity style={styles.avatar} onPress={() => setTab("More")}><Text style={styles.avatarText}>{String(household?.name || "O").slice(0, 1).toUpperCase()}</Text></TouchableOpacity>
          </View>
          <Text style={styles.saveStatus}>{saveStatus}</Text>
          {tab === "Home" && <HomeView messages={messages} proposal={proposal} input={input} setInput={setInput} sendMessage={sendMessage} approveProposal={approveProposal} rejectProposal={rejectProposal} startVoice={startVoice} voiceListening={voiceListening} setTab={setTab} plannedDays={plannedDays} basketCount={basket.length} />}
          {tab === "Week" && <WeekView plan={plan} recipes={recipes} people={people} setInput={setInput} sendMessage={sendMessage} />}
          {tab === "Shop" && <ShopView basket={basket} budget={budget} setBudget={(value) => { setBudget(value); saveSnapshot(plan, extras, inventory, brandRules, value); }} extras={extras} addExtra={(value) => { const next = [...new Set([...extras, value])]; setExtras(next); saveSnapshot(plan, next, inventory, brandRules, budget); }} />}
          {tab === "More" && <MoreView people={people} inventory={inventory} brandRules={brandRules} setInput={setInput} sendMessage={sendMessage} signOut={() => supabase.auth.signOut()} />}
        </ScrollView>
        <View style={styles.nav}>{TAB_ITEMS.map(([label, icon]) => <TouchableOpacity key={label} style={styles.navItem} onPress={() => setTab(label)}><Ionicons name={icon} size={21} color={tab === label ? C.green : C.muted} /><Text style={[styles.navLabel, tab === label && styles.navLabelActive]}>{label}</Text></TouchableOpacity>)}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoadingScreen({ text }) { return <SafeAreaView style={[styles.safe, styles.center]}><Text style={styles.logoMark}>OWS</Text><ActivityIndicator color={C.green} style={{ marginTop: 18 }} /><Text style={styles.loadingText}>{text}</Text></SafeAreaView>; }

function AuthScreen({ onSession }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true); setError("");
    const result = mode === "signup" ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (result.data.session) onSession(result.data.session);
    else setError("Check your email to confirm your account, then sign in.");
  }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.authPage}><Text style={styles.logoMark}>OWS</Text><Text style={styles.authTitle}>{mode === "signup" ? "Let’s get your shop sorted." : "Welcome back."}</Text><Text style={styles.authLead}>Your household, meals and stock stay saved securely in your account.</Text><TextInput style={styles.field} placeholder="Email address" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} /><TextInput style={styles.field} placeholder="Password" placeholderTextColor={C.muted} secureTextEntry value={password} onChangeText={setPassword} /><TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={busy}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Text></TouchableOpacity>{error ? <Text style={styles.error}>{error}</Text> : null}<TouchableOpacity onPress={() => setMode(mode === "signup" ? "signin" : "signup")}><Text style={styles.switchText}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</Text></TouchableOpacity></ScrollView></SafeAreaView>;
}

function SetupScreen({ household, onComplete }) {
  const [name, setName] = useState(household?.name || "Our household");
  const [people, setPeople] = useState([{ id: "local-me", name: "Me", role: "Adult", portion_multiplier: 1 }]);
  const [personName, setPersonName] = useState("");
  function addPerson(role) { if (!personName.trim()) return; setPeople((current) => [...current, { id: "local-" + Date.now(), name: personName.trim(), role, portion_multiplier: role === "Child" ? 0.75 : 1 }]); setPersonName(""); }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.setupPage}><Text style={styles.kicker}>FIRST, A LITTLE HOUSEKEEPING</Text><Text style={styles.authTitle}>Who are we feeding?</Text><Text style={styles.authLead}>This lets the assistant understand different meals, portions and days at home.</Text><Text style={styles.label}>Household name</Text><TextInput style={styles.field} value={name} onChangeText={setName} placeholder="The Parker family" placeholderTextColor={C.muted} /><Text style={styles.label}>People</Text><View style={styles.peopleList}>{people.map((person) => <View style={styles.personPill} key={person.id}><Text style={styles.personPillText}>{person.name}</Text><Text style={styles.personRole}>{person.role}</Text></View>)}</View><View style={styles.addPersonRow}><TextInput style={[styles.field, styles.personInput]} value={personName} onChangeText={setPersonName} placeholder="Add a name" placeholderTextColor={C.muted} /><TouchableOpacity style={styles.smallButton} onPress={() => addPerson("Adult")}><Text style={styles.smallButtonText}>Adult</Text></TouchableOpacity><TouchableOpacity style={styles.smallButtonLight} onPress={() => addPerson("Child")}><Text style={styles.smallButtonLightText}>Child</Text></TouchableOpacity></View><TouchableOpacity style={styles.primaryButton} onPress={() => onComplete(name, people)}><Text style={styles.primaryText}>Continue</Text></TouchableOpacity></ScrollView></SafeAreaView>;
}

function HomeView({ messages, proposal, input, setInput, sendMessage, approveProposal, rejectProposal, startVoice, voiceListening, setTab, plannedDays, basketCount }) {
  return <><View style={styles.hero}><Text style={styles.heroKicker}>YOUR WEEKLY ASSISTANT</Text><Text style={styles.heroTitle}>Just tell me what’s happening.</Text><Text style={styles.heroText}>Meals, people, what’s already at home — I’ll turn it into a plan for you to check.</Text></View><View style={styles.chatCard}>{messages.slice(-5).map((message, index) => <View key={index} style={[styles.message, message.role === "user" ? styles.userMessage : styles.assistantMessage]}><Text style={[styles.messageText, message.role === "user" && styles.userMessageText]}>{message.text}</Text></View>)}{proposal && <ProposalCard proposal={proposal} approve={approveProposal} reject={rejectProposal} />}</View><View style={styles.inputRow}><TextInput style={styles.chatInput} value={input} onChangeText={setInput} onSubmitEditing={() => sendMessage()} placeholder="Tell me about your week…" placeholderTextColor={C.muted} multiline /><TouchableOpacity style={[styles.iconButton, voiceListening && styles.iconButtonActive]} onPress={startVoice}><Ionicons name={voiceListening ? "radio" : "mic-outline"} size={21} color={voiceListening ? C.white : C.green} /></TouchableOpacity><TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}><Ionicons name="arrow-up" size={21} color={C.white} /></TouchableOpacity></View><Text style={styles.exampleLabel}>TRY SAYING</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}><TouchableOpacity style={styles.chip} onPress={() => sendMessage("Put chilli on Thursday for me") }><Text style={styles.chipText}>“Chilli on Thursday”</Text></TouchableOpacity><TouchableOpacity style={styles.chip} onPress={() => sendMessage("Monday me and the kids are having salmon and broccoli; children waffles") }><Text style={styles.chipText}>“Monday’s meals”</Text></TouchableOpacity><TouchableOpacity style={styles.chip} onPress={() => sendMessage("Add toothpaste to my shop") }><Text style={styles.chipText}>“Add toothpaste”</Text></TouchableOpacity></ScrollView><View style={styles.dashboardRow}><TouchableOpacity style={styles.dashboardCard} onPress={() => setTab("Week")}><Text style={styles.dashboardNumber}>{plannedDays}/7</Text><Text style={styles.dashboardLabel}>days planned</Text></TouchableOpacity><TouchableOpacity style={styles.dashboardCard} onPress={() => setTab("Shop")}><Text style={styles.dashboardNumber}>{basketCount}</Text><Text style={styles.dashboardLabel}>shop items</Text></TouchableOpacity></View></>;
}

function ProposalCard({ proposal, approve, reject }) {
  return <View style={styles.proposal}><View style={styles.proposalHeader}><View style={styles.proposalDot}><Ionicons name="sparkles-outline" size={17} color={C.gold} /></View><View style={{ flex: 1 }}><Text style={styles.proposalTitle}>I understood</Text><Text style={styles.proposalSummary}>{proposal.summary || "Save this change"}</Text></View></View>{proposal.type === "plan_meal" && <Text style={styles.proposalDetail}>{proposal.assignments?.map((assignment) => assignment.meal + " for " + (assignment.peopleIds?.length || 1) + " people").join(" + ")}</Text>}<View style={styles.proposalButtons}><TouchableOpacity style={styles.approveButton} onPress={approve}><Text style={styles.approveText}>Approve</Text></TouchableOpacity><TouchableOpacity style={styles.rejectButton} onPress={reject}><Text style={styles.rejectText}>Keep unchanged</Text></TouchableOpacity></View></View>;
}

function WeekView({ plan, recipes, people, setInput, sendMessage }) {
  return <><Text style={styles.sectionKicker}>THIS WEEK</Text><Text style={styles.pageTitle}>A plan that can change.</Text><Text style={styles.pageLead}>You can talk through changes at any time. Each meal shows who it is for.</Text><View style={styles.weekList}>{DAYS.map((day) => <View style={styles.dayCard} key={day}><View style={styles.dayHeading}><Text style={styles.dayName}>{day}</Text><TouchableOpacity onPress={() => { setInput("Put a meal on " + day); }}><Ionicons name="add-circle-outline" size={22} color={C.gold} /></TouchableOpacity></View>{(plan[day] || []).length ? plan[day].map((assignment, index) => <View style={styles.assignment} key={index}><Text style={styles.assignmentEmoji}>{recipes[assignment.meal]?.emoji || "🍽️"}</Text><View style={{ flex: 1 }}><Text style={styles.assignmentName}>{assignment.meal}</Text><Text style={styles.assignmentMeta}>{(assignment.peopleIds || []).map((id) => people.find((person) => person.id === id)?.name).filter(Boolean).join(", ") || "Household"}{assignment.leftovers ? " · leftovers planned" : ""}</Text></View></View>) : <Text style={styles.emptyDay}>Nothing planned yet</Text>}</View>)}</View><TouchableOpacity style={styles.secondaryButton} onPress={() => sendMessage("Put chilli on Friday") }><Text style={styles.secondaryText}>Talk through a meal</Text></TouchableOpacity></>;
}

function ShopView({ basket, budget, setBudget, extras, addExtra }) {
  const [extra, setExtra] = useState("");
  return <><Text style={styles.sectionKicker}>YOUR SHOP</Text><Text style={styles.pageTitle}>Only what you need.</Text><View style={styles.shopSummary}><Text style={styles.shopBig}>{basket.length} items</Text><Text style={styles.shopSmall}>Meals, regulars, stock shortfalls and extras</Text></View><Text style={styles.label}>Weekly budget</Text><TextInput style={styles.field} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="Optional — e.g. 100" placeholderTextColor={C.muted} /><View style={styles.addRow}><TextInput style={[styles.field, styles.extraInput]} value={extra} onChangeText={setExtra} placeholder="Add anything" placeholderTextColor={C.muted} /><TouchableOpacity style={styles.smallButton} onPress={() => { if (extra.trim()) { addExtra(extra.trim()); setExtra(""); } }}><Text style={styles.smallButtonText}>Add</Text></TouchableOpacity></View>{basket.length ? <View style={styles.shopList}>{basket.map((line, index) => <View style={styles.shopLine} key={line.name + index}><View style={styles.shopCheck}><Ionicons name="checkmark" size={15} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.shopName}>{displayQuantity(line.quantity, line.unit)} {line.name}</Text><Text style={styles.shopDetail}>Needed for {line.source.join(", ")}{line.inStock ? " · " + line.inStock + " already at home" : ""}</Text>{CHEAPER_SUGGESTIONS[line.name] && <Text style={styles.savingText}>Budget option: {CHEAPER_SUGGESTIONS[line.name]}</Text>}</View></View>)}</View> : <View style={styles.emptyState}><Text style={styles.emptyStateTitle}>Your basket is clear.</Text><Text style={styles.emptyStateText}>Plan a meal on the Home tab and I’ll work out the ingredients.</Text></View>}<Text style={styles.phaseNote}>Retailer prices and basket hand-off will be connected once the relevant supermarket access is available.</Text></>;
}

function MoreView({ people, inventory, brandRules, setInput, sendMessage, signOut }) {
  return <><Text style={styles.sectionKicker}>MY HOUSEHOLD</Text><Text style={styles.pageTitle}>The details behind the plan.</Text><Text style={styles.pageLead}>Tell the assistant about changes here, or just say them in the conversation.</Text><View style={styles.moreCard}><Text style={styles.cardTitle}>People</Text>{people.map((person) => <View style={styles.moreRow} key={person.id}><Text style={styles.moreIcon}>{person.role === "Child" ? "◦" : "•"}</Text><Text style={styles.moreName}>{person.name}</Text><Text style={styles.moreMeta}>{person.role}</Text></View>)}</View><View style={styles.moreCard}><Text style={styles.cardTitle}>At home</Text>{inventory.length ? inventory.map((item, index) => <View style={styles.moreRow} key={item.name + index}><Text style={styles.moreIcon}>✓</Text><Text style={styles.moreName}>{item.name}</Text><Text style={styles.moreMeta}>{item.quantity} available</Text></View>) : <Text style={styles.emptyDay}>Nothing recorded yet</Text>}</View><View style={styles.moreCard}><Text style={styles.cardTitle}>Protected choices</Text>{brandRules.length ? brandRules.map((rule) => <Text style={styles.rule} key={rule}>• {rule}</Text>) : <Text style={styles.emptyDay}>Say “always buy Heinz baked beans” to protect a brand.</Text>}</View><TouchableOpacity style={styles.secondaryButton} onPress={() => { setInput("Always buy "); }}><Text style={styles.secondaryText}>Add a brand preference</Text></TouchableOpacity><TouchableOpacity style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity></>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  page: { padding: 20, paddingBottom: 110 },
  center: { alignItems: "center", justifyContent: "center" },
  kicker: { color: C.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  greeting: { color: C.green, fontSize: 22, fontWeight: "800", marginTop: 5 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.white, fontWeight: "800", fontSize: 16 },
  saveStatus: { color: C.muted, fontSize: 11, marginTop: 5, marginBottom: 16 },
  hero: { backgroundColor: C.green, borderRadius: 24, padding: 22, marginBottom: 16 },
  heroKicker: { color: "#D8E9DD", fontWeight: "800", fontSize: 10, letterSpacing: 1.3 },
  heroTitle: { color: C.white, fontSize: 25, fontWeight: "800", marginTop: 9 },
  heroText: { color: "#D8E9DD", fontSize: 14, lineHeight: 21, marginTop: 8 },
  chatCard: { backgroundColor: C.white, borderRadius: 22, padding: 14, marginBottom: 12 },
  message: { borderRadius: 16, padding: 11, marginBottom: 8, maxWidth: "92%" },
  assistantMessage: { backgroundColor: C.greenSoft, alignSelf: "flex-start" },
  userMessage: { backgroundColor: C.green, alignSelf: "flex-end" },
  messageText: { color: C.ink, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: C.white },
  proposal: { backgroundColor: C.goldSoft, borderRadius: 17, padding: 13, marginTop: 3 },
  proposalHeader: { flexDirection: "row", alignItems: "center" },
  proposalDot: { width: 31, height: 31, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center", marginRight: 9 },
  proposalTitle: { color: C.gold, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 },
  proposalSummary: { color: C.ink, fontSize: 14, fontWeight: "800", marginTop: 2 },
  proposalDetail: { color: C.muted, fontSize: 12, marginTop: 9 },
  proposalButtons: { flexDirection: "row", marginTop: 12 },
  approveButton: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 15, marginRight: 8 },
  approveText: { color: C.white, fontWeight: "800", fontSize: 12 },
  rejectButton: { borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rejectText: { color: C.muted, fontWeight: "700", fontSize: 12 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 14 },
  chatInput: { flex: 1, minHeight: 50, maxHeight: 100, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 14, marginRight: 7 },
  iconButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center", marginRight: 7 },
  iconButtonActive: { backgroundColor: C.gold },
  sendButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  exampleLabel: { color: C.muted, fontWeight: "800", fontSize: 10, letterSpacing: 1.1, marginBottom: 8 },
  chips: { marginBottom: 17 },
  chip: { backgroundColor: C.white, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, marginRight: 8, borderWidth: 1, borderColor: C.line },
  chipText: { color: C.green, fontSize: 12, fontWeight: "700" },
  dashboardRow: { flexDirection: "row" },
  dashboardCard: { flex: 1, backgroundColor: C.goldSoft, borderRadius: 18, padding: 16, marginRight: 8 },
  dashboardCardLast: { marginRight: 0 },
  dashboardNumber: { color: C.green, fontSize: 22, fontWeight: "800" },
  dashboardLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  sectionKicker: { color: C.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 8 },
  pageTitle: { color: C.green, fontSize: 29, fontWeight: "800", marginTop: 5, marginBottom: 8 },
  pageLead: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 17 },
  weekList: { marginBottom: 16 },
  dayCard: { backgroundColor: C.white, borderRadius: 18, padding: 15, marginBottom: 9 },
  dayHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dayName: { color: C.green, fontWeight: "800", fontSize: 16 },
  assignment: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, marginTop: 5 },
  assignmentEmoji: { fontSize: 23, marginRight: 11 },
  assignmentName: { color: C.ink, fontSize: 14, fontWeight: "800" },
  assignmentMeta: { color: C.muted, fontSize: 12, marginTop: 3 },
  emptyDay: { color: C.muted, fontSize: 13, paddingVertical: 4 },
  secondaryButton: { backgroundColor: C.greenSoft, borderRadius: 14, alignItems: "center", paddingVertical: 13, marginBottom: 16 },
  secondaryText: { color: C.green, fontWeight: "800" },
  shopSummary: { backgroundColor: C.greenSoft, borderRadius: 18, padding: 17, marginVertical: 15 },
  shopBig: { color: C.green, fontSize: 24, fontWeight: "800" },
  shopSmall: { color: C.muted, fontSize: 13, marginTop: 3 },
  label: { color: C.green, fontWeight: "800", fontSize: 12, marginBottom: 6, marginTop: 5 },
  field: { backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, height: 48, color: C.ink, fontSize: 14, marginBottom: 12 },
  addRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  extraInput: { flex: 1, marginBottom: 0, marginRight: 8 },
  shopList: { backgroundColor: C.white, borderRadius: 18, overflow: "hidden" },
  shopLine: { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  shopCheck: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center", marginRight: 10 },
  shopName: { color: C.ink, fontSize: 14, fontWeight: "800" },
  shopDetail: { color: C.muted, fontSize: 12, marginTop: 3 },
  savingText: { color: C.gold, fontSize: 12, marginTop: 4, fontWeight: "700" },
  emptyState: { backgroundColor: C.white, borderRadius: 18, padding: 20, alignItems: "center" },
  emptyStateTitle: { color: C.green, fontSize: 16, fontWeight: "800" },
  emptyStateText: { color: C.muted, textAlign: "center", lineHeight: 19, marginTop: 5 },
  phaseNote: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 16 },
  moreCard: { backgroundColor: C.white, borderRadius: 18, padding: 15, marginBottom: 10 },
  cardTitle: { color: C.green, fontSize: 16, fontWeight: "800", marginBottom: 9 },
  moreRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line },
  moreIcon: { width: 22, color: C.gold, fontWeight: "800" },
  moreName: { color: C.ink, fontWeight: "700", flex: 1 },
  moreMeta: { color: C.muted, fontSize: 12 },
  rule: { color: C.ink, fontSize: 13, paddingVertical: 4 },
  signOut: { alignItems: "center", padding: 14 },
  signOutText: { color: C.red, fontWeight: "800" },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, flexDirection: "row", paddingVertical: 9 },
  navItem: { flex: 1, alignItems: "center" },
  navLabel: { color: C.muted, fontSize: 10, marginTop: 3, fontWeight: "700" },
  navLabelActive: { color: C.green },
  logoMark: { color: C.green, fontSize: 30, fontWeight: "900", letterSpacing: 3 },
  loadingText: { color: C.muted, marginTop: 14, fontSize: 13 },
  authPage: { padding: 24, flexGrow: 1, justifyContent: "center" },
  authTitle: { color: C.green, fontSize: 31, lineHeight: 37, fontWeight: "800", marginTop: 15, marginBottom: 9 },
  authLead: { color: C.muted, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  primaryButton: { backgroundColor: C.green, borderRadius: 15, alignItems: "center", paddingVertical: 15, marginTop: 7 },
  primaryText: { color: C.white, fontWeight: "800", fontSize: 15 },
  error: { color: C.red, fontSize: 13, lineHeight: 18, marginTop: 12 },
  switchText: { color: C.gold, textAlign: "center", fontWeight: "800", marginTop: 18 },
  setupPage: { padding: 24, flexGrow: 1, justifyContent: "center" },
  peopleList: { marginBottom: 10 },
  personPill: { flexDirection: "row", backgroundColor: C.white, borderRadius: 13, padding: 12, marginBottom: 7, alignItems: "center" },
  personPillText: { color: C.ink, fontWeight: "800", flex: 1 },
  personRole: { color: C.muted, fontSize: 12 },
  addPersonRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  personInput: { flex: 1, marginBottom: 0, marginRight: 6 },
  smallButton: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, marginLeft: 2 },
  smallButtonText: { color: C.white, fontSize: 12, fontWeight: "800" },
  smallButtonLight: { backgroundColor: C.greenSoft, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, marginLeft: 4 },
  smallButtonLightText: { color: C.green, fontSize: 12, fontWeight: "800" },
});
