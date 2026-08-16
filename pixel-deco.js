/* =====================================================================
   Décor pixel art — sème des petits pains, gâteaux, plantes, bocaux et
   fleurs pixel dans tous les onglets du site (purement décoratif).

   Correctif "guirlande invisible en ligne" :
   les images étaient chargées avec un chemin relatif ("pixel/food/...").
   Selon l'hébergeur, l'adresse d'une page publiée peut être /todo,
   /todo/ ou /dossier/todo.html — le chemin relatif ne pointait alors
   plus vers le bon dossier et les images restaient vides.
   On calcule désormais l'adresse à partir de celle de ce script
   (pixel-deco.js), et on essaie plusieurs emplacements de secours si la
   première tentative échoue.
   ===================================================================== */
(function () {
/* Sprites pixel art intégrés (base64) : la guirlande s'affiche même si le
   dossier pixel/ est absent ou bloqué par l'hébergeur (GitHub Pages...). */
var EMBED = {
"pixel/food/food-01.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAABACAMAAABWbGUSAAAA/1BMVEXv7url5eLX2dbm4tqSmJXow62yWFOytbKtY1PZlozbp4zmvKaUW0bq2dGmqqaGi4eZY07WjIWboZ26aGPJeHDJysfe4NyUVj3is5udo6DBamThq5POta2ydnF3WEjRhHp1e3d+hoKlS0ioiXmtjIS0mZDSmHt7Y1Z5gX3HpqLEwb7e4eCQeGy7pJe+wb7glpDlq6huSTqOamGYg3fBZF9+T0lobmqbSELfsJb7+/kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACkEiSxAAAAQHRSTlMA////////////////////////////////////////////////////////////////////////////AAAAAAAA4zDSkgAAA7RJREFUeNqVlomaojoQhckCJBAIEDZBr9pq793TM3PX93+xWxVABZH55qiI8OekrCRFHGeindZ7/aytnAUBpTWlxKqEk53mPL4D75/3zwgzSzNKgeV8jiSxr/Xu711RkF5L8H5vv6wchw1NCNdkBt6RMz00sjBnt7DWCCHFLjB99TmnMzCfgVnxuZpxBoEH8OMwigKyOQfHMaVwY3C2/fn+nTzzuECYdjAji7Dj+L5P6SWD/gLaweWZJZ+fhbMo68y6EaSU/goeclEskBHIJpn0UdD7MUQPHgqOESNvEEDkDVrPwf88PDwADT2wX8GeJ61STwhjTG5SaV+LsPQEvDwj5Ddsegc2Uubo2gjx1ebGpGm63aapMHOwkLJB0z9F8/WVG9FAK5FvPe/lBmbH40ka6B/NX142jW0G9mIGttp4XipNY2ixyU2ee55aGL6jgH9pxIbSTd6ki/DG5JArcO5gTEX64x7eACzlt9w6N3mXdG92Avl+I/I8T1MYQJgiLAJjhF9nJlTh+8bCMupXFMISYH86oRg6q7/yLQxD1C0oJlMYQmP8G9gubEJOnpfnvbODtgkjtCwyPgcfPW+7jfpyZWFbTuNspmScV0pXdvpySmg2rruaD0xfMPDMvuECja/h3Y4MDDl9fMTr9fq1KPqUAcz1KIgLnICESBR+XcpqHPvX8NA3UApoqwt8VW7O8Fqo0HXDMKjrACSqpF/q8Q1MyFoIF+G6/jcI2kApRbBOEnYbRpJ8RAwmhcWDIKzbtv7+HfPH/FtYndgIxkgSm+wJDL0l1aGDQwtj3K0QeGkSM6PKA8h18R5zUegdBkGSnCDma5iySCkLw2yOAA4RrgGWQhzZGCYlwCEK8N47aOswlAhPU8eiqgo7DXAbhC7AKjlOYmY0qpLQHdQnBYcnEOLAxiPIyqhSZ/YcidvDbARTgjG7E9V1LR9FcnibwOwaHk5gUB4fwXkKU4DXQNl89E1CC6vkZ0knziwqVbXFYWtxwtmDhIhVBE+B8hrOWMnom1IHgNqeRBizDE9dcI5HziUFZ6GqqlJ46KRUFNGSsfIazvAKU3BTqQQPuK4ErjCIgVBGx3OjLBnRh5/v7+8/np6e/hj0hE9Z6DW+LHDMBg4D7AcYHavbho3gDFoDjJ9lWD9n8H/xip3KZCrbBqqIjVrrDLkS6XPFmsIgWx215lB8OpW37BjmHDaGGe+UrVB8lcVxlmX2d8bhJOv2jv/tcD/bs3y1ilcZkDEiMTbhq+Gedn5L/wM9uUYNSwfbFgAAAABJRU5ErkJggg==",
"pixel/food/food-02.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAABACAMAAABfh8VoAAAA/1BMVEXv7urn5uPt1c7qybanalGtdFnkua6ytrPRl5XExsSuV1bUp6jLiInox8iuemrYqpKyh4mZZU/YtrHV1NHcs5u1l5STWE20ZmW9wb7htZ20hG2+wsDFd3bIwr2KSEimS0rr4t22qabt0L3WnaHElHq6ppvCbW7FhHfjrq7nvsC+kHZ7YVOWdGG2WWOyfIHe4N2HVT6eYmIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACbabReAAAAQHRSTlMA/////////////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAA0QHDIwAAA6xJREFUeNqVlgmboygQhgMCQVBQVIxGu3Nt0j0zO7P7///cVuGRmNizz1QukLe/og60N5s/tyxJ8D1MjuZnlmm9CibBRlAnMkl+yleqyjJKD5SmaXXcbJyDORolL2CSjNckyGTSkXE7L6Ac3ZBjRUiWjWAivwJhnWSTOCHya0UE5QxmK+FstD48rVKSVasgXYCEuPU8TuDm/0BIn3YhJ2eC5tyXRUSQYBYDuF5Adz7rYBWCB1Jk5iyzrHqJ2kkdUClJANMkkRprv8QIgGeJgjIjGwMglRLB54RXtaHB0k+hlBBeJc4NV96UXwOpCKBSNzGCXr09g9dr13VSAqjf3uvBUHEB/m3StDYdbErWwXV9rbu6vq6Ck+v3d6VU96HTNI3S9Mm1uoNMKXgnQmC7o/gjWPTae9iSybpEKe/flPkQoAjgv7VfJCh9RwOfKkkOxNxqNdrzoSm8V4FTCVTa3DoYhflKua+1+ARvcMqISSQFt1231hak7nBXqYET00pN6ecqCMc1xcAHxUrqIQuvrVZ1DyC0rhjBpzYjO+wUiSuhraHN4GBQ5z5FURSP4H4ChRuOSwAF6D6D2yxbgHFQfAXjMNPiQ4z3ElATAodLsNiG2VFrBHGdwujjGdzu5jpRxjjnzHDG83l9t53A7XyNAgUsfnIy/XkRj4N+GnzP82gy2+Q/RjKe1rc9eQQpvAC03AzbncDZ8SiXM4aDpmxAc7MKslNE6Qk3CKAQjeX8VbHKPTilIWr4iQTjorSyqiA5xa9fxR0EGTqDIMi5K2GfPA51ikcQGkux6BRAhiAVnJUImn4BVl6KJopazCDq4j6ZE9aWtm0NIfsZzGUZQDaAWBkG4YDmEvzLyyhizHuPKQx1oacoMlyIC6Tz7noEGfsH9XLwHEAOkX/jC8VcQuIwe1H07cK4tRJrYyZw18+Kl8Bh/aB7eIQZwkFTXgyCuxlsbRlA4Rg02Qhi0sMe9wgeATwyA6kQ0emEq0hF8AuhuPI2B4OgZjdrGzG0BCQoOkUM9YRrgus5ag2K0tqwSbSWhxYqm7JszWMwR2+kHDSRO7WwAwTBLm0L4L3WlHksmC1L55wNmcLKMN7TwwOIpwrAwbBlxWCl4T0+7eI7SKAgKs8xFjZ8c9O2rbUF+ttv7yAhuQeGTYbpZpzgUQRwj+BxfDrnPA+SiHAzfB/Cc5bMhyEmkx3Iq92Pa1yQ39l8A8B7z2i7bbzfx8Nrsv3iJjVy/Q5sD5+J6uO+/7P/Bf8DThVGAtKpO9UAAAAASUVORK5CYII=",
"pixel/food/food-03.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAABACAMAAACJIh8NAAAA/1BMVEXv7uqKSTbYpo6TUT2YVkLv2Mfqx7DRlXnSm4R6QzFyOiiqZ1DluaPKiW/u0bzjs5u0emTdspukXEaSeHC2hnOxclvWtqeEPSmVZFLgqZJ1Vkvy49ray8SGbGObgnqwmI7z6OJTKRliMh3Vw7p8Y1jCfWLEeVuki4VUMidsTEK4q6Td0MmETUGai4WiVD1ULiFeRjxhLxiropsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4NGUWAAAAQHRSTlMA//////////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAA7okrcgAABWJJREFUeNqtl4l26jgMhivbxFtCFhJIoKWldJnebZb3f7j5JSchtL1z5p4ZtUAS/FnyL1kJNzf/px38276/2xxffxWk0X4JOt+uqqrrekO0Ohz+Ped9yGB5bi15/w8Df/OeMGIaQ/SYrQGW1u7owm23t6vV6vBwieC02y2X4+lxLVxR7BZLxNw8LPyeTvenU16Wgxueu0qphwfxt2Ywz/OwW3Dj5Kd0+kSPpWIrChvN7c01N/m7PbZtUXUxagpJq6cQ8qF0zBVNc545kHk2c+dvVCIs1mogek1cNpkt6u12BW4FbAWX4JIMZ6JtXQMEt/vIORNjO3GZtW5wIYTErXAxW+d5RtTiSr/kbGwacCcInjGnOBUc6la4THTeCXe3CxPkwMUO3J/ArCjlLBTcns/3vWZ/woXd8Ypz4J5fXgrkCFwhZpnbE+k8W00WaMNxzpxSP+dMduG8cPCnnM2zDCmU8spIB14fG66BQ4Eb6AGpYOuJC2EYuSFb8xrEXzI1KOii6UfDwXAA8Ju4r1vVFkXyJytf6wWnyp0m3fyINmEFxyMcdjfiL8syk5xl24yMFwhBI9Pwh3XYulbs0iL1E3fzRruyrLO1rCrPtKyPs5w4jUJNqjjrikLN3J65UhbHYmjxJ3WW5yUtOJHcLTgqa44TcViH+cCtlZxYRY1OeUoaezo9TDtr8iecVYb9pWMY1LziTLi5cNCF82ORZ1VrzXGKO5QQNU3iDsLRkvNBWQU0id8YDVym90Zz0TguHFheY7lXHKaeOWMIAiROC1eMMWM1M4eO0vvgFv6M0Qhw5Br78jIt1UJYFOHYOUJAw0SzUqyNUk41jeYxWY7ibGhQNk2XcbvRKNfN5kviAgXyVKOB5AoBN5rS3OVARpcLDpDWJuVPOKSMVF3WOTc2fJO4WmmtBwk5cR7zGD1zsatQhUG6o+fy538D67GF0AGqqmrb+7ZtcZ0vLji6NsNvvBZtlpdxBQsJdMf7KISueh6HyZc8KQJME+jpiK/jvyhG7jb42MVKrOW3LvY9FgGRxQgvnxbAV+zkbxUCNEo1zFbWCm25rvNtvcWew0fOh5OZJlLicBMT4Z1jDKLWzOGvLGWCmnXG1Vwsxki6T6nfpIh8CkiE7GM/6mj5hoIXSognBufDfub8QrNRQk4VC4RyxXLxkY51mPffhkV4nwaTioPHi5bjrGaxHzbexyYWBeRElAUftAWGVBHR9kZIvo+ncJZcaGLkzeLgQfE6HFebG01ZBI/Lrqiqa38omSiSIi7JBnZFNE52PI+HI/nsKq2v4uy66KSbmImLWk/+bGuSc1tV13Gi0M0sJ28VEaOZa2xp1xxdqlPuI/ynpSRlFt4j4yyfcHrK3JgtEsdGxmvJqEGRztzRe5SG1AO+wt5FXdYYz88nKDPF+xf9YsDWL/TiyYu552eRADMOIozSo7LpxGhRq7DLOI9EXfec/JlGfeSQHhq5pZ54EmgulRS5QGIPz1XfS3V3HdbGaUCqltwr0tA0szQsBcmeFw21tCKuTK3lOesS5+mE7jOmQdqEbAHJIdNm7FUch1nUizwkBtle+B66yP3EoM7SM0Vb8ZbsuML1t72/5kiKkWY1pFIxlxNdUH64uaBF3L97Np44HrCUXpy7yPXJnP7ISf7MzBGnOm0phbTi4aBosbr3nPfoVCwXngjFsFL+6JYn+rM48SgYkQydRkZE3MTJoC7eOVXvuIfDge9J3F6lWUvKmhlEdfF0+6f+r09/DfCPAcGJj8ePtFu4fx8//xWBnu7TsLSv0iTjDPz+KfdwmJ7Kvt6e0dG/fLm/v3/9ftxsNndPT/v9m//j+3/+xfY3zFRdT/1CSDsAAAAASUVORK5CYII=",
"pixel/food/food-04.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAABACAMAAACwRa5WAAAA/1BMVEX15tXu7emzdFnrzLfv2cbRx6qIeVOta1Lu0byNg1rHiGrVpouYaFKze2LOlnnitZtxaErUtZp8c061hmzNnIKtlniViWTkuqHVu6Pb0rjBfGK7spGsoXiOXUqxmoNoXTq0qYpjXUXvz8Dv6+Sck264sqDBel3JwJ7d2M1tYD1+d2SPb2CZcmHgrZL58dwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABR2SacAAAAQHRSTlP/AP///////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAz4NhkwAAA81JREFUeNqNlotioyoQht0BEURUVIyJ6WW3ez+X93+88w+gsT3ttpMWVD5/ZgaYpPiU7OnTe1bk7nOf7Wce6Psh3v9+QT5hIJnMA4PCZxjU/Jz89m2eZ2MwaMqfzMqif3jofz1A4Dn50Je+XEo2pXo8VarcLD7YyWEAmdBZQaUw5kaaI9kP8WEIsxkMyxnV9+F6Pf9PM5PXwM6CPBtlzHUjP7+ieWWQSfUH0sNRz35i9vPZqLf85AFf/vgBD2d1BmneiL3HizHPPTvYwwPkFt0Ab8xO3lVENCo2JJ47sxvuTajr+nJxIJuqompslGoYHZidmWY9fnMEWbtEtqI8LdZbz2GDWrxnP/GK9d5GqzMptZQ6sBSTjSjFbDgqqJ9OEqYjWVUT38hg1OqZ7BchjTqX4WuA/nIjG2oTOZglrruSEuvOST8rI+KYSJo0FWz3Sq1rWX41Cjc5n2bmkVdIv/Ia9Tt53smYJcpkua4hPD6GEHATwvq4ruucSJ00NzIqGbPKePkvDoFS6fEe+43kBXrM1+CGfiNFjn0nD/Z0uL6RtvizgXRNnN1/lKzEu6S+0EZW2FBUWKKaCkHk7gtyNBYFNqRmkiJJIIk3aePRkEOa6X50tSMF3o1214wkpFyzEF5ptMOMIy2FqwpqMATSHTSxoUtPUK0EWbuMzuMhNNFKrSnFrtlPzFt4tHUj0I4j3gXpCENaiiMpFlILWQxpsr4c+d2KvUJMWlz2LOGJ5IiKyt1pYj8rBL+R0KS4RtHPu4aUryDewKnmPmA9gFXUVIS9dDmQsGJhkUrirIZQ2URiRl73PfaRrShdMSpoOgoBWVKcIioL+Hkj31tNRx9d90g275Navzb7FM1aNO30cic/I0M7tW1rLZqdzBEdyFSDOqHZ0g2P6b2G3MgW01ovgErBtWtqRT6bx4iknYBEYNFghe5gtj2SSyLbVsDs9I9N02sP0FoZs+RuJGaKpBCdPXEXya5t04lLmiWTbS2yedv56OspkjLmM2nG874pCnFC+J5Foektl0ydKliuIRup+a/rTrAuacrtbDZVkM9mB8nUKX5qe6jJFZfBov6Olen8KUFdalq71c+kObFm7dqp27EuTc6R32rIXZod7NGw6mi2dZeUZh8z2d643G/kl5zPUcoXG5L/EEgRvzhekPIA7YzMpDiQcuPkSy5+Hekc+5gSzguoU0L3Ln1ErgwgtXjDtoGcpTpt7ymdHewpztHYjpuhiH5PmrEgo3jQZbuk3MEulC6jZram4f8GlRStQ3Fq8NuAfx/A/v5r+wX4AfsP8mhGc0j62lMAAAAASUVORK5CYII=",
"pixel/food/food-05.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAABACAMAAAB4KUSAAAAA/1BMVEXv7urt1tbqyMjluLfUl5fIiG7Jh4jZqanrybfDdnW0eHHhrKzXtLPPknfx4uCwa2vjtZyRSTS3h4i6g2vv4N63eV3XppC6mJfx0bvbx8WFZFmzaFLv3+DFfoFsOSiSaGjovsCXUjuUVkqGPSmZc3PUm6HgqZWsW0bBbnLesJfawr5vVk+UT0Ctf4G7oaIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4B+7mAAAAQHRSTlMA/////////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAA2JklMAAAA6hJREFUeNqtlwlbozAQhs1BQgKEs6jb07rq6h7//+ftzCRchbJ1Hz+VUMrLN5kMSby7+2Jpr1Sn7nOgDFKy+S/wRcpPODrO+H2FQkfW3IxyuJ95CSGUVOmNIIMYB1Cq20D2kaYTUKn9TeCjUopzjhQ0gmRBt4DVCDwRqPbHG0CphCCUd7LKHm8KFUtGiJR4D+5vCFXuEfSdI4yxSqnv/0gpY6mqJDqCehByU0FdrIB/oMbYhTBFnOuqul+rUPDCe4nYDaAQJynXwHv9olmgdmwMihWwUqMwdzs3DIfPVFpVyymCcQhUsxuBp5MIupZbNXZsWF8Agvfg7zkFcfCQFMZGRRMGhBIm+Gme2kcpp0NwwfmrTM0mhAm4zKGpVAsgv6QWSkEuOXI+d3KYJ1D3RDmb9PhLANmaIYDsAvzoHFnag65xzq2CbVluoyjmoo8Q1Lim6Tgfh07E9m3zdK6G+d6Dp2CEFYcI9M35UfAhwEv6tt2WZQ86csziEGEDBHM7NxoG33cAtwjWPrPffp1t27YijkAGD1nkjxmc1HU0liiKNsvK8zcEy3LTg9FmuCnzaDj1TSGKVmbPTwFExzjurOB7vDHzJyPBVwi2WVl24OvreyziVRWDZNk7vhbvcfxZ8Hg41KIY+z08PNDRnz74jwW+kQUd5eHwM4zj4bncoCz8wNHayNYWfvHcX9hggkGbzVM5TM7p8/MTpH2aea/ZNVu+1QN4OJT0RBxJ69uotjSwNQ7lCK/L82jmcQ0zxpdjorEBYbUkiYiptKWkGVJuDW+mL5YzCusbFo0U1wHf4EcsegRhxpKvMo8uXytHcyNPdUJgQg0syImARgEIiYWjMWw+OXpHIuAFCiA59mC7AO4VZ6NQg2MiRAg1FthVk/MFR7KahKo9WBEo1kE9DjURugsVkgOpzg2fJwdXfVxSERQdmAwghKrNDLyDJWBIThfqFNQysfZxYXGk5YqsAs8S3fcREmxUvryqEpisgOYauB9AHbLaFwDUwnXQIKinIPYR1up1RwC5BxNq4CnkCPsc2G0lar8SKoCchlMHx9g7Ing9OaYHdaLHleMdV0K1fAqCMdUqbA/W+2g1beOwnFt8r7GPJw67BtwYXnWUyuRQKgDGHqTqhBWMQKlXQ00wOALRWKAj7VMUDmV+Zdf6CBtG2IDjXRaeoUgwM8KfMTbPc+jt1f844OvcTAWUyQ1cX9skO2su9YN+LDzuvLbTPVqICcLLQzvW8e5L9Bf5bEJalDDWSgAAAABJRU5ErkJggg==",
"pixel/food/food-06.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABACAMAAABxwuT6AAAA/1BMVEXu7emOSDSlWkOZUjzrx7LbpYqtZk3TlnnJh2rw2Me6dVlxNybWnIKUWETiqY+hVD3lvKV0RDXBe1zy4dGVZlDu0b12VEm2emNaMyfls5lJJxzXuKWDPSu3hWvDfWFiLR3btJtOLCJwTEOQdm3u5uFiLiHozsN9ZF2mkYm7qqPEgF4uHxg/IhxCHhB8a2SDTkCLb2SgTjmnjIPUoHnGr6fgnogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAEAcWAAAAQHRSTlMA//////////////////////////////////////////////////////////////////////8AAAAAAAAAAAAA/0VFGwAABbVJREFUeNqtl4l24joMhsex4y12nAXIBAhtZzrr3bf3f7X7SzYUKJ323HPVNizNZ8narLx79z/Lpu8/9H2/YYksq9XqjXAEKS5Eiti/Ee77RjyT5lXsa0/i/VBD2rql37mt6xDqkHfxA/jPhnQOwxDqIu3xTc36f2T8V77jcBhIbf6BgAxtnaKU8kV4dC7oSmttrWGDM1rwukpSCvH4ON72034/WduGYAJt0wz2uyUxM8OGpBVx8xJs6YYAIUttFizFqhk2KW1u2ozY2kB6tZ5MMMYfDsSaMJPl/2RYiBvwR7FnLRSUP1JKFURW/MKSKijHKqFukXDXcPMEI6P4/lRgzVeKWzvjIsQVPE57hrG0sSIVZUUQAIbh/RlBE/ICft80kzGAh8OBIx3d2iny1mCHYUIII9YSifzY0uXc8ifY2gI7p4bBevzaae0CmS6g3NScs+fKAXuGkSNAkQ33kGVZ/MEv1oZF521gX7zz+nzbR9hQ9UFE0noloR2au67N/st+oES5hJsTTBkoZaK7BWD7fem6WkR58h8yDxmTjmb/9POWkpF2K5VSmkLD7t3t8FHFqL3X9F0l4W94HjBCuvnyEfB2+wkfDKtdKyWPoam6TkE53vrJ5686peD0XKWi3xQ4MCwAfz6DFcFJVB6q6RsNQyopcp3nPN1u2eyAxIpKrSWxmqzMcIwZBh0JrrLmI9zcdXNnc59LcufcSkPHWnFeinFc8AZOJn9gCVnBoWruhPhA8N2dup+XfaYFwxXgdQSc4PMFtmSYfC4TfNN1XdEMeDeb/Z7qQcgOcJRgye+IHGk+wrgBSQrl8OVRc4PvA3dbbI9i5JyUUSadC2oZxx1FspIwO1E3qmihoplgI8huhBS1XDsHK+KxngB3SKDIsGCzAfQF/oTwBoL33lv0SFjeRylyTkm5jE4taEC8FqxDwl1pDnuBrLfkZxV1cuM4coB0p5ZURXxcLELm5/tZFpj3/KlRO9qzCbWnmynJnBsds1gMoYqjGw++wNnsfAAQTA7r0Z4WhrFbSo/VCmmNwljgPSyGg9IPE0dYnOCHBprv4fwo5IxrJD/jTnQTKgzJ+vEZy3FnXWH57mR203TEqlUUZDNVJJUgaStVBp8njeaMFo7cdli1Kxn2wDDKDw7uFBmVuAA1VHWcVfAcXI1tY2MJMBJovs/w4zj+sr1bKTXPs8ytJNH9uhf9OK5RcGy45h4jUcvr9fr8uEQbAoxa0WyzzPtMCbnp0GFKnXHUcepQ0V/2MIZbjdTIMKKCdKFOhLaojyWONvQXNMMxTzC2LesZ3oHfcp/zOkdcylBbbKOSKfFalMl0Yl1ojvcMz122jvZMK0lpQoYlQvgSjObCmjvK/6pCOjFcCYLpG32CLcHiHEZFTsYqFkcpQD2YfsgHaECuCFwgqUHHK9hzwRO8Vj2xlcxlVV3Ahhe9hKmqCrxmWJ4EBp9g2vA1fEeaJ13PyG7QKIqjTJAFZx1lG3mLzyQhfrsym4Yoa5EqUO2eC88qIVXCHrx4tmfBk0WGb9DG0AGL3LbDBbz58vtmL6IuUqsz6bpdlon+hfD7Sui/v307Hw52TaPrVrLx1lyLzecgQhQwVjwbYjMsys4LE06vHCGqmRDm8ww5g2vvpwMVAkIcKcAlVDRVVbaYUN+G6X80AMZcWqW4ZenAPABjLKxF09+Es8RybNGVziZcccrkwRmjmmjE4yXsdrsVnxiekpdVRjozJHck+HjKk6gQdwjbjQkSkwnGJ2NO83mdR9iis8Dbm1MvYD3QpHpG4yA4DvtH+P0L0/r4mTdKEwyeMzxSibeBOc5b/+pjimv4rBxI7MGeBGOlfRX+LOiMBwzF9Oezagygw+HVBxSHCukbPWF4Qrrklymb4N+zvPp0Bc+J/vRkdny4e3zbE91HgGxC04un58I3wr8+bEkeHh7YUn7K++Gz3H+SfwEv3Gni8EtmNQAAAABJRU5ErkJggg==",
"pixel/food/food-07.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAA7CAMAAAD8UnzuAAAA/1BMVEXv7uru2crz5NrmubbSmI2taVjiqafpx7mziHXTpJi0dWXGeXPcp6TJhnqXZ1XpxMLTuKi2lojQioPElH2wcVyPWky7knu0bGOZd2emWk/bxLXhpZy6opbx6OLUsZx7WEyPamPinZmyjIbt0L2ehXfCbWXey8N0TT6YcFvisZtvTkW+q6Td0s7pv8D38+oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9NKCrAAAAQHRSTlMA/////////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAA2JklMAAAA+JJREFUeNq1l4mW2jgQRSOrZG2W8YYXDCS9JplJ5v8/b55kG2xD003n5AE+h26/q6pyaeHLl7+t71uvNP36WcBWbDshxPbTgK/CKxXbT7n3ea5zfcygPdJI/70X8E0IxljkJQUy2R/uBpgRwDKfyT66yy6EzjJvDvKYHNW4B9DRCkB3AaLuhThnZwBjR9W2vqIZez/7bbONYyoK5wqiEwUyxogmeRfQiK7jMRHBvgL4aur3G7DruiShUWwmtMOPVG82t8dvYj6TpIcVBmHcBLxYPQdw0h7xUUD+aPhaknOUlI5nQHWr/bqlFZffAGgiPQFUJW7Vr7kSAE/iGcAI84Y7SXKeDAVILhLhyamUUrbtt2tTy1oXXxql3MjNAoAgqqtLhLPu7IuDV3qvXEXgAZeLVG7ccCPfTBpJMd74oBCxcx7KWHUlArJ2AkwIVAKvxJvjQDoBjLiI4KCtnaq+jMA7+zjW/lF6AK+VQhZL+6N1NNyLAZNBceKHtdZiVuIFOVsQAOpKIz1aS6i1BEAjUniHtHkMv3MBgIujB6Sgqss+UI0hX/H4Qs7SSVojAp5dAJizp2aJCzuT85/5dKYCUTnjloDXoXwh6BHQ2KYxI2UBoBgpGLUEbCZAmHXI1geLt878rsLnKxIVVvhkVwAhimKWqGZLRePijCIRNcbkNwEP/RoQLQBYDNQKcHhd5vmW5PFn7wohTO5r0c720EfRfAig+wFQM1aXZ0DrV2oW3TY/SZ5xJGgNKZ0xpnU++f9LTQBEs1oz+SQH8aPkeCBEpe4J7f7SZKEoO7nbfv8H9rRK4eu6JeBp8kv+E6tyWfqH01PhyJgslFXupEj9TpmKALiI4ATwy3pQ/9BjLgYAbn3dYY9phwiQvjE9acwiTKFhIoY+SmK0BGEeh7ayxqdaid34XKM07NUDwJoeaSaUJMNMHCBw4opv4T+wB4JcAn4oEyLwderDbPPT3mFxxIhQA1PnD2oiD0KTBXem94z9AuAZf1Rqr03AN40YBGe4hrB94OG0M3UlpGeNlBMdonZ0iqrCG58QcVV5Qvi6BpTnCVmXdRS1qRcOpePR1AvjKy8fOunBeBgBpM+AvKaJe6sXo4VIqdPOlPsIBvodAHo+R5DnoXdWt7wl9AQ6c72nUFlT7c+RHwBQjfhXAG8n9a4XcW52u71Osmy9LaIZ8nwHZbcANSIt3z4kMsRxO4zaKaduAVCJ/BTuFUDru+KdY2qk6pJqlLmdXKVSGBly7YfOyAAoVZblKReFqaXCn54/BAhhQu0Oe4rOsLl47TYbtNJ9PzcwLmJR9ad/8Y2R0J8C1N/9Yfo/7vlDHjj+F7oAAAAASUVORK5CYII=",
"pixel/food/food-08.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAABACAMAAACEPG9KAAAA/1BMVEXv7urpxq+saU/l5eOytrLXp4vIysblvKPT1dK2c1fQlnnjtZvt2Mimqqbp4tru0byWZk+VWUPGim6Ym5fRnIKVUz2wh3O8wL3d4N2iXEPbsZjRxLetpJrPuavhrJCboZ2wfGWSTTiUdGW3kXm0l4d2UkGbpaG+w8CPbWCWhHnizcJ/YE6QcV3Mr6ne3+H28ukAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkupwVAAAAQHRSTlMA//////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAwCMTfgAABAFJREFUeNqllol2ozgQRZGEEBJYIDZveE066e7Z/v/v5pUEDjg2PnOmchxA1KWqpKeCKPp/tgomxsvY22qBiOdEPNhSjH51qut6JGrCn8egW1Z4g6dP0Y/jOl7FzwgxEHU9Jx4ndloR4T2S9TpJkjQdidXjxPqBCF4o4It4EqOeEUhxEwj7lBC+FhGFxBDDE1Ysz24cC2GH1GNPCLFevyCsHVOnOvw0LBGRqD/qNB0JYUWSiBfKqlcg7EggpyRd9Ld5vzvs99bXazd72EFKuUDws8pUllmqdy2EYjBpmgVCV0wplYWsrD0oXMpmieA6z3NW4Mlv5o2xgkwasxTjRlSVuRELMf7pugIEQzIgfBWMHdjvxdnqjKkMTFfaeGsOL9aDCEK0rkzjkVdEgkJypI6jMSzPU7IlXX0KCw8QWHhTJeSeJAu6guogJZvupIRrY3yEBSWmw46S0vqjENJISMvaZztkJEwzEFEgNpt4/bBktIKgbMQYNqVs5NBdcPeBzMexCeETfEas6nHsfSCi6HA4DDEwA3cTUNeTSRfTbSdGJl4gIjE5WGtz7DCxuety9SmNsNv69/f3Lop+Xa/lz7Is6c4PVzpX5iDmMU4gOufclnP4lTyYJ/zZd2L1QQTfbvnWCVu6suSOO2RkWwI0y5P7GHXHO6Z2WZbteBk2hlScO+zhTElZ8e6e+HjjHd3NdhnnA5FxDQKjRFzviL4HwfZKsQxP9huRZWApHD3oeDTuz8kqnurWScW83w4EppPOiMjzgimJKIaXE6Ku21ayQCgGIp8QGMq+E/2lbZARAuB5Woc6djvUwXwDe0C0lwbdkJqIlDpUrnaS61KpgWi25aQFI6uLwR1P3GJQ5Vz5wjO0OT4lTn3booHIoyTTXMpjIykRvqUDDZuKl+lkrnrnqOWQf9NoHkiJrByN0M9U5ZRYx/v9uW1biORmGn/0T9MP192sDeGll1y//L2PDha4b0Qc79MOMaDZc9Vpjq7os+HjtGEeG/fHjHAt5gqrS3cHN5yRzIvCE8eG8xnROqPU4IdXArnhFOuBnloUJMZ7wl0MFrAYCWuLKcEeEZRV0FUgfDztCWiRfSew5tlNibrwXgxsWYS4RJQz4tJWmd8cIKAS+BXQriYlDoS8I1xbeV0pn9WoK8QYiQxZJTNie5Y7mfnXE9d4YuYVph02+fF4DCKbE21HXSG8AgNxJIJ7pZMZXc6IH+5My1SR/XXous5L5LfNSTReV2drN5vUi3GPzxu8mfrt1gVZWfFTB6/87/w8Sq2jF0lyIzZC9K0bpGjFVQe/PM01H5T4K4QgIrwcP2N8WR7w3ZM8MfJKJnWQrdefSfIcSNPJjvoao4+xVx9t/9n+BZixRgUQsPl1AAAAAElFTkSuQmCC",
"pixel/food/food-09.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAABACAMAAABbchVVAAAA/1BMVEXv7urlubHs08/qy8now6/Vl46rV0yQRjXcqKTktJq2ZlfapZPhqaa3c2zJhm3bubSSVEq0bGTVl3vhq5HCeFrDeG91OSmFPCu7dViLTEPPjIejTEJ4RDrcwbxYMyeXUTyTa2O4lo7dsZaNY1myioPBbmXy5uJxLBuzg29zLyJ+UUugST+8gV/Dg1/YoH/Yy8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhb6iTAAAAQHRSTlMA//////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAwCMTfgAAA3hJREFUeNqllumWqyoQhQ8igiAocUxMejzdZ7jT+7/d3YVztPPj3lpxWPq53VUUxG/f/kc8NderpCiGeIS2bSvxk7TH4REqV/EAfWpacaIQ4mRw6Ig3X719QAHSSf0l+vn0oyHFv0mXVJ2Uz1LcbvdgBAGWlmWKYBTGmJNzTu8NR20LjFDGYkLLsjyJqtqhLy/vJ5EOinFA45QePFBtWvlmwIV3B1EWnjtCm2eTmoDEUKUI7zhG09RUVdfR1rmYHvgKlWl6AlZh09VfJEwe9ugnvDLmusB2ruoGC2znNW+u6dtYTZJD3o48wBJO7lA5Fj6IxQCAwAGhd6ptOw7RiP75s7MdambKA5Qt4BQ0YBjaLXqTDWNv92jwtEWjKJeSBjKMD0bTiLGquIDWwuRprlNJm2C0mqMLbw/PSZlQFCs0JbTTXdXVAX1LQzem7YJGPG5+NGg39D0a1ISxdNahpKYU9HJtsiTRgyRmmxBad1M6VFSH/gNLqJ3RX5iWUpiu2qKlAUqq0mdKJx7osD44h8mRzsVKTSCN0dppZ5TWhNLy8CxJhRp7rD1yojBlkdTWZSNatNJ762p3csgNe4fsBHlH2JxZ79SEnhPOI60TnZSm/vjwdV0KcRHaa13b/GbrBe2B8nNxLgqlrLc17hujBE6gDdUFPf9BqqFZMMAsy7KcRwhwuJRzay9mrTqjSmWZihaUA3Uq03VQ3aKZUis0JrQGqi2hyQOU8xiqZMDuDMDqxsCNj2kFdFaNB6+DKr8IEQ8GwhAcoNlRWjsDgyqCisVHA/GhAbZWHdA4X1cAaLTxms1eh7RsTQ2295qNKI8GNI4JVQ/R0WvM0RbzwB4a4EtaPhjwB8VSGzSPSdUkd2nlE8pxYUKZJ/SoAtnQA+jgIa08H73qobOiux7gKzSGqoIBv+ksPqAbVdTV+6lYAeWLgVE1WqUlxrTkjLJJlVOMxYLXOpsM9Bs0tMuCUlq1OUSVIAMrlBE6zditamZ2qt6IJKxZWGrvJ8yM5qRqrRDfX183FQDK7tMi1Gv/GZbsBc13qgH9sNMXFFA4wg1hOFeXy1B6xmpaiBRQ/TL9vVyB4ttjh/phzcr9gsqe0JXqZYXi+8Dr9wk99z3Wzb5PDkJje13+CM9S9r2cbvYLE45af1/QYooz1ljEFfG7KN5f7E9UU6l//sMn6L/U8lDlArp3NwAAAABJRU5ErkJggg==",
"pixel/food/food-10.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAtCAMAAAAp3Z1oAAAA/1BMVEXv7urVlXrNiG3sybXZnIKTVkOQSzfCdlyVUTzZo4rFfGG0Z1C9c1jt1smmWkTx49x7VEfv0b2OZVfnvKZwRjiUd2zhqpFQKRyylovRt63ks5vy5eF5TkCwiHTXw7pcOS2iVD2yema6pZ1TKyBsOyuITkKmjYLAblbYsZjdysDhzsWKbGHf1NDhnoQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOeb6BAAAAQHRSTlMA////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAASeXzkQAAA4RJREFUeNq1lntX4kAMxZlhMq9OC4WCgLC+dXV3v//X25tMS1vAo/xh5Oipml9vbjKPyeTH4/V1tVot/ixyEGI+vwpAZL23nsjjhyXPiKsA1lrPH98mI/xVgBd7Et7TbDKZ4etr8WSJlNZaqanEcmkQSluuh74jHsEAfQQE5Cvlv+cEZYDEtCXIg6mKAp/NZvN4OXPTNHdPNzc5VRTogPidIUYYMTla0OIy4JDF65yrddR6zYQMCIJNLtpPy9hY7rlXeqhgvWYFdQdwlwHz+Xw/31MIy+kxdkJgkhERwbQK/CWAl2kxZgAIkq8ZYACouRGGARWm+gxgYb0vRgrYeSlGq2BYUUC+iijB+wsAmbUQdj1hCft0tkOhCMyRdkVROHcGwHhF3QX+G8a1xk+zBpYuprrkAOAlNgLgF5EzM4BbB0AtzmvOlnTDqMQCHPt1Ckjy7gNDlFrv1jt5f11m801uK15fcBGotS+hbPZN71srAcGLZzot67Lk6hU/RveG12OWK28HAOCWI4DuAKoDBDHBaGSziGK0N81oDFCiQGYHRpZlWTOAJWAGEbHyfoZoX0/0bGRWVBj4Lgqy9xCyNuvkjpHuh1NYYr/K/hgZFRHRAYzJHQxmHTE9UbsoFowA1C577tY0L5lDrsG0a5rdC1HLnDChoKaZjBxUXcDttox6WtdtcmhLd7y4uYG0Gg4ASugBLDr3HtaXnQfKSOUuZkB1AvC+0GogFqbXnA5AXnsIrl5KQP0v+3kP+Ft+bIviQelegOkXUjv8CZ3n0lOF8HY0wE+eHdRHBUp1zskWbuRvTsY3RcgHYHyw3KCHepTb997kYwDjj+wCRUTk47Q4BVC7X/Svl8q5ZQnB8l1KLhHM8xRO9pCsQA8IrABjG1g7l87zg86/FZZPWHo8B4x6qNh43nnyys/e4RRIKRZytJ4DBlMkRQeeJZMXA+dHzdZVVbPd/novy9szAHlX9Abw1IPQJfPgx1Rh9uju8ikCBRYb1ECBjK6cSCAk/sbVfw5oGpsSdo5/wyHI+bAOy67yVGLpn2nvtpLZ7czfV7JLuH5XlsCy9xzNF+f4ra1QBJJdnyuo5ORi5J+/AMw8VZEbrkcKHvCcr0XN1zehVXuR4huZ3F/yxYx+ffcqtaKcTpLG75Xi/fsVgO4SR+19kpHN9xUga7V6OODeswlbjNxHWXJ/fv4m/B9+nTEO/ABHbgAAAABJRU5ErkJggg==",
"pixel/food/flower.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAABACAMAAABr/gR0AAAA/1BMVEX////FqnQ2YStVhCns2aovVCZGcR5GcSLy5LL+9NRijjAsVRuzxKhHbScmTBu7pXbx+Oa9qoPArIrQuoZEbh+ZroP36syvvanJuH8yTC1AWzqJmoWtvprfy5nbyavlzZno2cOyw548ZhyHln+Yq36csYrb4NkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZoXX1AAAAQHRSTlMA//////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcFLuNAAAAa1JREFUeNq91ul2gjAQBWAmkBkVEZAqLt3s9v6P2GSSsBSU5Fi8vxDzQXYSRR4pfApFGdkIIUOB8Ch+Pl/WJpcsE+fPnynQeSoSSVkHAAoCALDQqQBCQJKMgsLFgSIq8jw3IM+Xg/GQwsYB9filjTIA5V3gW/eFHlLJIWoANzoZgB1iA9RLCKcBhQCAN3sT2Gw6INFR5pEgb3uvMYgHAC6qbwC82MswsLgBCKsJsG97DzojDbbMq77adtvgA8opUG51DFAXZR+0vQf9FTcMg4Uv2NvOqLi+rlaVA5SZCClvgoMDqNLfnIKBaQPAu1vznTaomR5zhFj/afTMYHxfSqVccWYGqjRi9nCgthXE5xGgSvM3KBtukXQN6JHGIZADIOUNoPKEzTbs5tCmHTX5L+AjTfsgTVMDTqfTCKB4tSLCxvCc5sePL70RgBOA+PXqscfjkavkGnAFoAHoPiv291WQhYIo+iJbiQ64eSzZ4X2AfIDpSD68bPwAvwRxJmDXBfeVAnGcTp/chF55IYCPGBQAzEtmBjxPaWZAmQHSF9jDCYUCFAGgrms+do/99wu9YSFIsYwO0QAAAABJRU5ErkJggg=="
};

  /* ---- Résolution robuste du dossier des images ---------------------- */
  var SELF =
    (document.currentScript && document.currentScript.src) ||
    (function () {
      var s = document.querySelector('script[src*="pixel-deco.js"]');
      return s ? s.src : '';
    })();

  // Dossier qui contient pixel-deco.js (donc aussi le dossier "pixel/")
  var BASE = SELF ? SELF.replace(/[^/]*$/, '') : '';

  // Emplacements testés dans l'ordre pour chaque image
  function candidates(rel) {
    var list = [];
    if (BASE) list.push(BASE + rel);
    list.push(new URL(rel, location.href).href); // relatif à la page
    list.push(location.origin + '/' + rel); // racine du site
    var out = [], seen = {};
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i]]) { seen[list[i]] = 1; out.push(list[i]); }
    }
    return out;
  }

  // Applique une image avec repli automatique si l'URL renvoie une erreur
  function setSrcWithFallback(el, rel) {
    var key = String(rel).replace(/^\.?\//, '');
    if (EMBED[key]) { el.src = EMBED[key]; return; }
    var urls = candidates(rel);
    var i = 0;
    el.addEventListener('error', function () {
      i++;
      if (i < urls.length) el.src = urls[i];
      else el.style.display = 'none'; // image vraiment absente : on n'affiche pas de vignette cassée
    });
    el.src = urls[0];
  }

  var FOOD = [
    'pixel/food/food-01.png', 'pixel/food/food-02.png', 'pixel/food/food-03.png',
    'pixel/food/food-04.png', 'pixel/food/food-05.png', 'pixel/food/food-06.png',
    'pixel/food/food-07.png', 'pixel/food/food-08.png', 'pixel/food/food-09.png',
    'pixel/food/food-10.png', 'pixel/food/flower.png'
  ];

  // Plantes suspendues, pots, bougies, bocaux et petites fioles
  var DECO = [];
  for (var d = 2; d <= 35; d++) {
    if (d === 3) continue; // sprite tronqué
    DECO.push('pixel/deco/deco-' + (d < 10 ? '0' + d : d) + '.png');
  }
  var PLANTS = DECO.slice(0, 10);   // plantes & pots
  var OBJECTS = DECO.slice(10);     // bougies, bocaux, fioles, tasse…

  function pageSeed() {
    var name = (location.pathname.split('/').pop() || 'index.html');
    var s = 0;
    for (var i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) % 9973;
    return s;
  }

  function pick(list, seed, count) {
    var out = [], used = {};
    var i = 0;
    while (out.length < count && i < 200) {
      var idx = (seed + i * 7 + out.length * 3) % list.length;
      if (!used[idx]) { used[idx] = 1; out.push(list[idx]); }
      i++;
    }
    return out;
  }

  function img(src, width) {
    var el = document.createElement('img');
    el.alt = '';
    el.setAttribute('aria-hidden', 'true');
    if (width) { el.style.width = width + 'px'; el.style.height = 'auto'; }
    // Pas de lazy-loading : la guirlande est décorative et doit apparaître
    // tout de suite, même en bas de page.
    setSrcWithFallback(el, src);
    return el;
  }

  function isDashboard() {
    var name = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return name === '' || name === 'index' || name === 'index.html';
  }

  // Répare aussi les images pixel écrites en dur dans le HTML (profil.html…)
  function fixStaticSprites() {
    var nodes = document.querySelectorAll('img[src*="pixel/"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var rel = el.getAttribute('src');
      if (!rel || /^(https?:)?\/\//.test(rel) || rel.charAt(0) === '/') continue;
      rel = rel.replace(/^\.\//, '');
      if (el.getAttribute('loading') === 'lazy') el.removeAttribute('loading');
      setSrcWithFallback(el, rel);
    }
  }

  function decorate() {
    if (/[?&]embed=1/.test(location.search)) return;
    if (document.body.classList.contains('embed-mode')) return;

    fixStaticSprites();

    if (document.querySelector('.px-ribbon')) return;
    if (isDashboard()) return; // pas de déco pixel sur le dashboard

    var seed = pageSeed();

    // 1) Un petit pixel art à côté du titre de la page
    var head = document.querySelector('.rpg-questbar-title, .rpg-parchment h1, main h1');
    if (head && !head.querySelector('.px-title-sprite')) {
      var sprite = img(pick(FOOD.concat(PLANTS), seed + 5, 1)[0]);
      sprite.className = 'px-title-sprite';
      head.insertBefore(sprite, head.firstChild);
    }

    // 2) Petite frise (guirlande) de gourmandises en bas du contenu principal
    var host = document.querySelector('.rpg-parchment') || document.querySelector('main');
    if (host) {
      var ribbon = document.createElement('div');
      ribbon.className = 'px-ribbon';
      ribbon.setAttribute('aria-hidden', 'true');
      pick(FOOD, seed, 5).forEach(function (src) { ribbon.appendChild(img(src, 40)); });
      host.appendChild(ribbon);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate);
  } else {
    decorate();
  }
})();

/* Mode embarqué (iframe du carnet) : on masque la barre latérale. */
(function () {
  try {
    if (/[?&]embed=1/.test(location.search)) {
      document.documentElement.classList.add('embed-mode');
      var apply = function () { document.body.classList.add('embed-mode'); };
      if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply);
    }
  } catch (e) {}
})();
