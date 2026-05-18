<script>
  import { onMount } from "svelte";

  import Search from "./Search.svelte";
  import CardList from "./Cards.svelte";
  import Card from "./lib/components/CardProxy.svelte";

  let showcase,
    basics,
    reverse,
    holos,
    cosmos,
    amazings,
    radiant,
    basicGallery,
    vee,
    veeUltra,
    veeAlt,
    veeMax,
    veeMaxAlt,
    veeStar,
    trainerHolo,
    rainbow,
    gold,
    veeGallery,
    shinyVault;

  let query = "";
  let isLoading = true;

  const getCards = async () => {
    let promiseArray = [];
    let cardFetch = await fetch("/data/cards.json");
    let cards = await cardFetch.json();
    return cards;
  };

  const loadCards = async () => {
    return getCards().then((cards) => {
      window.cards = cards;
      showcase = cards[0];
      isLoading = false;
    });
  };

  onMount(() => {
    loadCards();
    const $headings = document.querySelectorAll("h1,h2,h3");
    const $anchor = [...$headings].filter((el) => {
      const id = el.getAttribute("id")?.replace(/^.*?-/g, "");
      const hash = window.location.hash?.replace(/^.*?-/g, "");
      return id === hash;
    })[0];
    if ($anchor) {
      setTimeout(() => {
        $anchor.scrollIntoView();
      }, 100);
    }
  });
</script>

<main>
  <header>
    <div class="showcase">
      {#if !showcase}
        cargando...
      {:else}
        <Card
          id={showcase.id}
          name={showcase.name}
          set={showcase.set}
          number={showcase.number}
          types={showcase.types}
          supertype={showcase.supertype}
          subtypes={showcase.subtypes}
          rarity={showcase.rarity}
          isReverse={showcase.isReverse}
          showcase={true}
          img={showcase.images.large}
        />
      {/if}
    </div>
  </header>
</main>
