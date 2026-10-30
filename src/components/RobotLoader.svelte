<script>
  const logoId=$props.id();
</script>
<div
  class="robot-loader"
  role="status"
  aria-label="Loading native OhMyPi agent definitions"
>
  <svg
    width="480"
    height="480"
    style="width:min(480px,100%);height:auto;opacity:.15"
    viewBox="0 0 160 160"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      class="robot-shadow"
      cx="80"
      cy="144"
      rx="31"
      ry="5"
      fill="currentColor"
      opacity=".13"
    />
    <g
      class="robot-bob"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M80 33V21" />
      <circle
        class="robot-antenna"
        cx="80"
        cy="17"
        r="5"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="35"
        y="38"
        width="90"
        height="64"
        rx="23"
        fill="var(--color-base-200)"
      />
      <rect
        x="45"
        y="49"
        width="70"
        height="40"
        rx="14"
        fill="var(--color-base-100)"
        stroke="none"
      />
      <path d="M34 62h-5v16h5m92-16h5v16h-5" />
      <g class="robot-eyes" fill="currentColor" stroke="none"
        ><rect x="57" y="61" width="11" height="14" rx="5.5" /><rect
          x="92"
          y="61"
          width="11"
          height="14"
          rx="5.5"
        /></g
      >
      <path d="M74 79q6 5 12 0" stroke-width="2" />
      <path d="M50 79h5m50 0h5" opacity=".45" stroke-width="4" />
      <rect
        x="56"
        y="107"
        width="48"
        height="25"
        rx="11"
        fill="var(--color-base-200)"
      />
      <defs><linearGradient id={logoId+'-chest'} x1="38" y1="56" x2="228" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="var(--logo-start,#e83dba)"/><stop offset=".54" stop-color="var(--logo-mid,#9c40f8)"/><stop offset="1" stop-color="var(--logo-end,#65b6e8)"/></linearGradient></defs>
      <g transform="translate(70.6 109) scale(.065)" stroke="none">
        <path d="M28 52H248V100H188V284H140V100H104V228H56V100H28V52Z" fill={'url(#'+logoId+'-chest)'}/>
        <circle cx="248" cy="52" r="23" fill="var(--color-base-200)"/>
        <circle class="robot-antenna" cx="248" cy="52" r="13" fill="#55f6a0"/>
        <circle cx="245" cy="48" r="4" fill="#d7ffe8"/>
      </g>
      <path d="M64 133v5m32-5v5" />
      <path class="robot-arm" d="M108 112q13-5 15-18m-4 2 4-4 4 3" />
      <path d="M52 112q-10 1-13 10" />
    </g>
    <g
      class="robot-sparkles"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      ><path d="M17 39v8m-4-4h8M140 95v8m-4-4h8" /><circle
        cx="137"
        cy="33"
        r="2"
        fill="currentColor"
        stroke="none"
      /></g
    >
  </svg>
  <p class="muted text-sm">Loading native OhMyPi agent definitions…</p>
</div>

<style>
  .robot-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 36px 12px;
    text-align: center;
    color: var(--color-primary);
  }
  .robot-bob {
    animation: robot-float 1.8s ease-in-out infinite;
  }
  .robot-eyes {
    transform-box: fill-box;
    transform-origin: center;
    animation: robot-blink 3.6s infinite;
  }
  .robot-antenna {
    filter: drop-shadow(0 0 5px currentColor);
    animation: robot-light 1.2s ease-in-out infinite;
  }
  .robot-shadow {
    transform-origin: 80px 144px;
    animation: robot-shadow 1.8s ease-in-out infinite;
  }
  .robot-arm {
    transform-origin: 108px 112px;
    animation: robot-wave 0.8s ease-in-out infinite alternate;
  }
  .robot-sparkles {
    animation: robot-light 1.8s ease-in-out infinite alternate;
  }
  @keyframes robot-float {
    50% {
      transform: translateY(-7px);
    }
  }
  @keyframes robot-blink {
    0%,
    42%,
    48%,
    100% {
      transform: scaleY(1);
    }
    45% {
      transform: scaleY(0.12);
    }
  }
  @keyframes robot-light {
    50% {
      opacity: 0.35;
    }
  }
  @keyframes robot-shadow {
    50% {
      transform: scaleX(0.8);
      opacity: 0.07;
    }
  }
  @keyframes robot-wave {
    to {
      transform: rotate(12deg);
    }
  }
</style>
