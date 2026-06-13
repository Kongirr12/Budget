<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<style>
    #loading {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10000;
        /* ใช้สีขาวโปร่งแสง และ blur พื้นหลัง (Modern) */
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100vw;
    }

    .loader {
        /* เปลี่ยนสี loader เป็นสี primary-color (Pastel Blue) */
        color: #76A9EA;
        font-size: 45px;
        text-indent: -9999em;
        overflow: hidden;
        width: 1em;
        height: 1em;
        border-radius: 50%;
        position: fixed;
        transform: translateZ(0);
        animation: mltShdSpin 1.7s infinite ease, round 1.7s infinite ease;
    }

    @keyframes mltShdSpin {
        0% {
            box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em,
                0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
        }

        5%,
        95% {
            box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em,
                0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
        }

        10%,
        59% {
            box-shadow: 0 -0.83em 0 -0.4em, -0.087em -0.825em 0 -0.42em, -0.173em -0.812em 0 -0.44em,
                -0.256em -0.789em 0 -0.46em, -0.297em -0.775em 0 -0.477em;
        }

        20% {
            box-shadow: 0 -0.83em 0 -0.4em, -0.338em -0.758em 0 -0.42em, -0.555em -0.617em 0 -0.44em,
                -0.671em -0.488em 0 -0.46em, -0.749em -0.34em 0 -0.477em;
        }

        38% {
            box-shadow: 0 -0.83em 0 -0.4em, -0.377em -0.74em 0 -0.42em, -0.645em -0.522em 0 -0.44em,
                -0.775em -0.297em 0 -0.46em, -0.82em -0.09em 0 -0.477em;
        }

        100% {
            box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em,
                0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
        }
    }

    @keyframes round {
        0% {
            transform: rotate(0deg)
        }

        100% {
            transform: rotate(360deg)
        }
    }

    .hidden {
        display: none !important;
    }

    #text_load {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        /* ใช้ฟอนต์ Kanit และเปลี่ยนสีข้อความ */
        font-family: 'Kanit', sans-serif;
        font-size: 16px;
        color: #555;
        margin-top: 50px; /* ย้ายข้อความลงมาใต้ spinner */
    }
</style>
</head>

<body>

  <!-- Loader HTML Element -->
  <div id="loading" class="hidden">
    <div class="loader"></div>
    <div id="text_load">loading</div>
  </div>

  <script>
    function loadingStart() {
      $('#loading').removeClass('hidden');
    }

    function loadingEnd() {
      $('#loading').addClass('hidden');
    }
  </script>
</body>
