<template>
  <main class="methodology flex flex-col gap-8">
    <a class="definition-link" href="#methodology-definitions">
      {{ locale === 'fr' ? 'Voir les définitions' : 'See definitions' }}
    </a>

    <template v-if="locale === 'fr'">
      <section>
        <h2>Traduction locale avec glossaire contraint</h2>
        <p>
          Ce document présente le parcours expérimental qui a mené de l'ancien flux avec masquage du
          glossaire et révision grammaticale française vers l'architecture actuelle de génération
          contrainte. Le produit exécute les modèles
          <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian localement dans le navigateur et
          applique les termes du glossaire pendant la génération plutôt que de réparer la phrase
          après coup.
        </p>
        <p>
          La conclusion est empirique : le chemin contraint sans révision a amélioré la qualité
          moyenne par rapport à la traduction simple et a nettement dépassé l'ancien chemin
          traduction + révision sur un banc d'essai indépendant de 300 phrases du gouvernement du
          Canada.
        </p>
      </section>

      <section class="metric-baseline">
        <h3>Comment lire les scores</h3>
        <p>
          Les scores <abbr title="character n-gram F-score">chrF</abbr> et
          <abbr title="F-score">F1</abbr> lexical vont de <code>0</code> à <code>1</code>. Un score
          plus élevé signifie que la sortie ressemble davantage à la traduction de référence. Dans
          ce banc d'essai, les traductions simples étaient déjà autour de <code>0,74</code> en
          <abbr title="character n-gram F-score">chrF</abbr>, donc les gains moyens attendus sont
          petits.
        </p>
        <p>
          Une hausse moyenne de <code>0,001</code> ou <code>0,002</code>
          <abbr title="character n-gram F-score">chrF</abbr> n'est pas, à elle seule, une preuve
          forte pour une phrase donnée. Elle devient utile quand elle va dans le même sens que les
          autres signaux : meilleur <abbr title="F-score">F1</abbr> lexical, plus de termes de
          glossaire trouvés et beaucoup moins de régressions graves.
        </p>
        <p>
          Le seuil de <code>0,01</code> <abbr title="character n-gram F-score">chrF</abbr> sert à
          compter les lignes qui changent assez pour être visibles dans une phrase individuelle. Il
          ne veut pas dire qu'une différence de <code>0,009</code> est sans importance; c'est une
          coupure pratique pour séparer les petites variations des changements plus nets.
        </p>
      </section>

      <section>
        <h3>Résumé</h3>
        <p>
          Les stratégies ont été évaluées dans les deux directions. Pour l'anglais vers le français,
          nous avons comparé la traduction <abbr title="Open Parallel Corpus">OPUS</abbr> sans
          glossaire, l'ancien masquage/réhydratation suivi d'une passe de révision française, et la
          génération <abbr title="Open Parallel Corpus">OPUS</abbr> contrainte sans révision. La
          révision a produit le plus grand nombre de correspondances exactes du glossaire, mais elle
          a introduit beaucoup plus de régressions sémantiques et grammaticales. La génération
          contrainte a augmenté le <abbr title="character n-gram F-score">chrF</abbr> moyen
          anglais-français de <code>0,7462</code> à <code>0,7484</code> par rapport à la traduction
          simple, a amélioré le <abbr title="F-score">F1</abbr> lexical de <code>0,7008</code> à
          <code>0,7046</code>, et a réduit les régressions graves de <code>39</code> avec la
          révision à <code>4</code>.
        </p>
        <p>
          La même méthode a ensuite été exécutée en français vers anglais. La génération contrainte
          a augmenté le <abbr title="character n-gram F-score">chrF</abbr> de <code>0,7420</code> à
          <code>0,7430</code> et le <abbr title="F-score">F1</abbr> lexical de <code>0,7161</code> à
          <code>0,7199</code>. Le taux de correspondance exacte des termes du glossaire était de
          <code>85,0 %</code>, près du taux anglais-français de <code>86,5 %</code>.
        </p>
        <p>
          L'architecture finale retire le modèle de correction française et utilise une seule passe
          du modèle de traduction local avec sélection de candidats, remplacement par ancre, biais
          souple dans le faisceau, correspondance de variantes cibles et filtres de sécurité pour
          les entrées de glossaire générales d'un seul mot.
        </p>
      </section>

      <section>
        <h3>Contraintes de produit</h3>
        <p>
          L'application est un produit statique côté navigateur. Les textes sources et les documents
          <abbr title="Document file format used by Microsoft Word">DOCX</abbr> ou
          <abbr title="Presentation file format used by Microsoft PowerPoint">PPTX</abbr> restent
          sur l'appareil. Les modèles sont servis comme actifs du site, chargés par Transformers.js
          et exécutés avec <abbr title="Open Neural Network Exchange">ONNX</abbr> Runtime Web dans
          un Web Worker. Cette architecture soutient la confidentialité et l'hébergement statique,
          mais elle rend la taille des modèles et le coût du premier chargement très importants.
        </p>
        <p>
          La couche de traduction utilise des modèles
          <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian locaux de type séquence à séquence
          pour la traduction anglais-français et français-anglais. Chaque direction est livrée sous
          forme de poids <abbr title="8-bit quantization">q8</abbr>
          <abbr title="Open Neural Network Exchange">ONNX</abbr> quantifiés. Les fichiers
          <abbr title="Open Neural Network Exchange">ONNX</abbr> de chaque direction
          <abbr title="Open Parallel Corpus">OPUS</abbr> font environ <code>133 Mo</code>, et chaque
          dossier de modèle fait environ <code>141 Mo</code> avec les actifs de tokenizer et de
          configuration.
        </p>
        <p>
          Nous avons aussi tenté de déplacer le grand banc d'essai vers Node.js pur. Le paquet
          Transformers.js du navigateur pouvait être importé dans Node, mais le chargement local des
          modèles et l'exécution <abbr title="Open Neural Network Exchange">ONNX</abbr> utile
          n'étaient pas pratiques, car le paquet exclut <code>onnxruntime-node</code> et son chemin
          Node n'exposait qu'une exécution <abbr title="Central Processing Unit">CPU</abbr>. Le banc
          final a donc utilisé le même chemin navigateur/<abbr title="WebAssembly">WASM</abbr> que
          le produit.
        </p>
      </section>

      <section>
        <h3>Première méthode de glossaire</h3>
        <p>
          La première implémentation du glossaire utilisait un masquage déterministe. L'application
          trouvait les entrées de glossaire activées, faisait correspondre les termes sources sans
          tenir compte de la casse comme termes entiers, triait les correspondances de la plus
          longue à la plus courte, remplaçait les segments sources par des jetons temporaires comme
          <code>ZXGLOSS0ZX</code>, traduisait la phrase masquée, puis réhydratait les jetons
          temporaires retournés avec le terme cible du glossaire.
        </p>
        <p>
          Cette méthode donnait un remplacement exact solide lorsque le jeton survivait à la
          traduction. Elle avait aussi des modes d'échec prévisibles : le modèle pouvait supprimer
          ou modifier le jeton temporaire, le terme français réhydraté pouvait se retrouver dans une
          position grammaticalement maladroite, et des entrées séparées au niveau des mots pouvaient
          produire un mauvais ordre des mots en français. Une solution de repli remplaçait le terme
          source exact seulement si ce terme source original restait dans la sortie.
        </p>
      </section>

      <section>
        <h3>Expérience de révision française</h3>
        <p>
          Une deuxième passe de correction française a été construite à partir de
          <code>PoloHuggingface/French_grammar_error_corrector</code> et convertie en
          <abbr title="Open Neural Network Exchange">ONNX</abbr> local avec Optimum. Deux variantes
          ont été produites : <abbr title="4-bit quantization">q4</abbr> et
          <abbr title="8-bit quantization">q8</abbr>. La variante
          <abbr title="4-bit quantization">q4</abbr> utilisait des actifs
          <abbr title="Open Neural Network Exchange">ONNX</abbr> intégrés dans des fichiers uniques
          pour éviter les problèmes de chargement dans le navigateur avec les fichiers de données
          <abbr title="Open Neural Network Exchange">ONNX</abbr> externes.
        </p>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Actif de correction</th>
                <th scope="col">Précision</th>
                <th scope="col">Fichiers</th>
                <th scope="col">
                  Taille <abbr title="Open Neural Network Exchange">ONNX</abbr> approximative
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Correction grammaticale française</td>
                <td><abbr title="4-bit quantization">q4</abbr></td>
                <td>
                  <code>encoder_model_q4.onnx</code>, <code>decoder_model_merged_q4.onnx</code>
                </td>
                <td><code>322 Mo</code></td>
              </tr>
              <tr>
                <td>Correction grammaticale française</td>
                <td><abbr title="8-bit quantization">q8</abbr></td>
                <td>
                  <code>encoder_model_quantized.onnx</code>,
                  <code>decoder_model_merged_quantized.onnx</code>
                </td>
                <td><code>727 Mo</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          L'invite de correction commençait par <code>improve grammar:</code>. Dans de petits
          essais, les variantes <abbr title="4-bit quantization">q4</abbr> et
          <abbr title="8-bit quantization">q8</abbr> corrigeaient des phrases simples mal formées,
          par exemple <code>Cliquez sur le connexion bouton pour commencer.</code> devenait
          <code>Cliquez sur le bouton de connexion pour commencer.</code>. Les mêmes essais ont
          montré le risque : le modèle de correction pouvait parfois inférer un contexte manquant,
          changer le sens, supprimer des termes spécialisés ou réécrire des abréviations
          officielles.
        </p>
        <p>
          Sur l'échantillon initial de 20 phrases avec glossaire, le chemin traduction + révision a
          produit environ <code>13/20</code> phrases avec correspondance exacte du glossaire. Il
          améliorait souvent la fluidité locale, mais ce n'était pas une étape de réparation
          déterministe sûre.
        </p>
      </section>

      <section>
        <h3>Conception de la génération contrainte</h3>
        <p>
          Les essais avec <code>force_words_ids</code> dans Transformers.js n'ont pas donné une
          contrainte utilisable dans notre chemin de génération. Nous avons donc ajouté nos propres
          processeurs de logits et un sélecteur de candidats dans le worker de traduction.
        </p>
        <p>
          Le chemin contraint actuel commence par une traduction normale de la phrase source
          originale. Si la traduction de base contient déjà toutes les cibles sûres du glossaire ou
          des variantes acceptées, cette traduction est retournée. Sinon, le worker génère des
          candidats à partir de trois familles d'indices :
        </p>
        <ul>
          <li>
            <strong>Remplacement par ancre :</strong> traduire la phrase source du glossaire seule,
            dériver des variantes d'ancre en français, trouver l'ancre dans la traduction de base,
            puis remplacer seulement ce segment par la cible du glossaire.
          </li>
          <li>
            <strong>Biais souple dans le faisceau :</strong> ajouter un biais positif au premier
            jeton des cibles de glossaire manquantes tout en supprimant une fin trop hâtive
            <abbr title="End of sequence">EOS</abbr>, puis forcer les jetons suivants seulement
            après le début d'une phrase de glossaire.
          </li>
          <li>
            <strong>Processeurs de repli :</strong> les processeurs append-before-EOS et hard-force
            restent disponibles comme candidats de dernier recours, mais le score pénalise fortement
            les sorties dégénérées ou les termes empilés en fin de phrase.
          </li>
        </ul>
        <p>
          La sélection des candidats évalue la couverture du glossaire, la couverture des ancres de
          la traduction de base, le ratio de longueur, la ponctuation finale, les répétitions
          dégénérées, le risque d'ajout en fin de phrase, les termes de glossaire empilés et les
          dommages aux articles ou aux prépositions. Le sélecteur peut accepter une couverture
          partielle du glossaire lorsqu'un candidat est beaucoup plus fluide qu'une sortie forcée
          exacte.
        </p>
      </section>

      <section>
        <h3>Filtres de sécurité</h3>
        <p>
          Le changement de sécurité le plus important a été de refuser les contraintes très
          générales d'un seul mot. Les premiers essais sur 300 phrases ont montré des dommages
          graves lorsque des termes comme <code>policy</code>, <code>regulatory</code>,
          <code>regulation</code> et <code>accessibility</code> étaient forcés. Ces mots sont assez
          communs pour que le modèle ait souvent déjà un équivalent grammatical dans le contexte; le
          fait de forcer une seule forme cible peut briser l'accord ou la syntaxe.
        </p>
        <p>
          La règle implémentée contraint les entrées de glossaire lorsque la source ou la cible a au
          moins deux mots normalisés, ou lorsque la cible/source ressemble à un espace réservé, à un
          acronyme, à un terme contenant des chiffres ou à un identifiant en camelCase. S'il ne
          reste aucune contrainte sûre, l'application retourne la traduction de base nettoyée plutôt
          que de revenir à l'ancien chemin de masquage/réhydratation.
        </p>
        <p>
          Le worker inclut aussi une correspondance de variantes cibles pour les flexions et les
          variantes officielles acceptées, notamment les formes plurielles de congés, les formes de
          contrôle d'accès, les variantes d'accord de niveau de service, les variantes de politiques
          d'approvisionnement, les variantes d'évaluation des facteurs relatifs à la vie privée et
          les variantes d'évaluation du rendement.
        </p>
      </section>

      <section>
        <h3>Résultats contrôlés sur 20 phrases</h3>
        <p>
          Sur l'échantillon contrôlé de 20 phrases, les premières variantes sans révision ont
          atteint
          <code>13/20</code> phrases exactes et <code>42/51</code> termes exacts, mais avec quelques
          fragments en fin de phrase. Après le retrait de la stratégie de forçage tardif et l'ajout
          des filtres de sécurité, la variante finale sans révision a atteint environ
          <code>18-19/20</code> phrases utilisables et environ <code>48/51</code>
          termes exacts.
        </p>
        <p>
          Ce résultat dépassait l'ancien banc avec révision sur le même échantillon, mais
          l'échantillon était trop petit et trop adapté à l'implémentation pour justifier une
          décision de produit. Nous avons donc construit un banc d'essai indépendant à partir de
          pages publiques du gouvernement du Canada.
        </p>
      </section>

      <section>
        <h3>Banc d'essai Canada.ca</h3>
        <p>
          Un banc d'essai indépendant a été créé à partir de pages bilingues Canada.ca, surtout des
          politiques, directives et lignes directrices du Secrétariat du Conseil du Trésor. Le
          script de collecte a extrait des paires de pages bilingues, aligné des blocs de texte et
          des phrases candidates, traduit les lignes candidates sans glossaire dans chaque
          direction, puis accepté seulement les lignes dont la traduction simple était assez
          semblable à la référence publiée dans l'autre langue.
        </p>
        <p>
          Cette étape de validation était nécessaire, car les pages bilingues peuvent différer sur
          le plan de la structure ou de la rédaction; le banc d'essai ne supposait pas que la parité
          du
          <abbr title="Document Object Model">DOM</abbr> anglais et français suffisait.
        </p>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Propriété du corpus</th>
                <th scope="col">Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Paires candidates traduites pour l'alignement</td>
                <td><code>600</code></td>
              </tr>
              <tr>
                <td>Lignes acceptées par direction</td>
                <td><code>300</code></td>
              </tr>
              <tr>
                <td>Lignes candidates rejetées, EN->FR</td>
                <td><code>31</code></td>
              </tr>
              <tr>
                <td>Lignes candidates rejetées, FR->EN</td>
                <td><code>32</code></td>
              </tr>
              <tr>
                <td>Pages sources distinctes dans l'échantillon final</td>
                <td><code>5</code></td>
              </tr>
              <tr>
                <td>Lignes avec au moins un terme source de glossaire, EN->FR</td>
                <td><code>203</code></td>
              </tr>
              <tr>
                <td>Lignes avec au moins un terme source de glossaire, FR->EN</td>
                <td><code>204</code></td>
              </tr>
              <tr>
                <td><abbr title="character n-gram F-score">chrF</abbr> minimal d'alignement</td>
                <td><code>0,45</code></td>
              </tr>
              <tr>
                <td><abbr title="F-score">F1</abbr> lexical minimal d'alignement</td>
                <td><code>0,25</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          Les métriques de score étaient le <abbr title="character n-gram F-score">chrF</abbr> sur
          les n-grammes de caractères de 1 à 6, le <abbr title="F-score">F1</abbr> lexical
          normalisé, la distance du ratio de longueur, les lignes améliorées ou détériorées de plus
          de <code>0,01</code> <abbr title="character n-gram F-score">chrF</abbr>, les
          détériorations graves selon le z-score par rapport à la distribution des deltas du chemin,
          et les correspondances exactes normalisées des cibles de glossaire comme mesure
          terminologique supplémentaire.
        </p>
        <p>
          Ces mesures doivent être lues ensemble : les petits deltas moyens indiquent une tendance,
          tandis que les comptes de lignes améliorées, détériorées et gravement détériorées montrent
          le risque pratique pour des phrases individuelles.
        </p>
      </section>

      <section>
        <h3>Résultats sur 300 phrases</h3>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Direction et chemin</th>
                <th scope="col"><abbr title="character n-gram F-score">chrF</abbr> moyen</th>
                <th scope="col"><abbr title="F-score">F1</abbr> lexical moyen</th>
                <th scope="col">
                  Delta <abbr title="character n-gram F-score">chrF</abbr> par rapport à la
                  traduction simple
                </th>
                <th scope="col">Phrases améliorées</th>
                <th scope="col">Phrases détériorées</th>
                <th scope="col">Régressions graves</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Anglais->français, traduction simple</td>
                <td><code>0,7462</code></td>
                <td><code>0,7008</code></td>
                <td>s.o.</td>
                <td>s.o.</td>
                <td>s.o.</td>
                <td>s.o.</td>
              </tr>
              <tr>
                <td>Anglais->français, génération contrainte</td>
                <td><code>0,7484</code></td>
                <td><code>0,7046</code></td>
                <td><code>+0,0021</code></td>
                <td><code>19</code></td>
                <td><code>9</code></td>
                <td><code>4</code></td>
              </tr>
              <tr>
                <td>Anglais->français, masquage + révision</td>
                <td><code>0,7321</code></td>
                <td><code>0,6829</code></td>
                <td><code>-0,0142</code></td>
                <td><code>56</code></td>
                <td><code>115</code></td>
                <td><code>39</code></td>
              </tr>
              <tr>
                <td>Français->anglais, traduction simple</td>
                <td><code>0,7420</code></td>
                <td><code>0,7161</code></td>
                <td>s.o.</td>
                <td>s.o.</td>
                <td>s.o.</td>
                <td>s.o.</td>
              </tr>
              <tr>
                <td>Français->anglais, génération contrainte</td>
                <td><code>0,7430</code></td>
                <td><code>0,7199</code></td>
                <td><code>+0,0010</code></td>
                <td><code>23</code></td>
                <td><code>11</code></td>
                <td><code>10</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          En anglais vers français, la génération contrainte a battu l'ancien chemin avec révision
          de plus de
          <code>0,01</code> <abbr title="character n-gram F-score">chrF</abbr> sur
          <code>116</code> phrases. L'ancien chemin a battu la génération contrainte sur
          <code>48</code> phrases. Le delta moyen génération contrainte moins révision était
          <code>+0,0163</code>. Aucun comparatif de révision n'est pertinent en français vers
          anglais, car le modèle de révision était un modèle français seulement; la question de
          parité pertinente pour le français vers anglais est la traduction
          <abbr title="Open Parallel Corpus">OPUS</abbr> simple par rapport au décodage contraint
          par glossaire.
        </p>
      </section>

      <section>
        <h3>Résultats terminologiques</h3>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Direction et chemin</th>
                <th scope="col">Lignes avec glossaire</th>
                <th scope="col">Termes exacts</th>
                <th scope="col">Total</th>
                <th scope="col">Taux</th>
                <th scope="col">Lignes avec tous les termes trouvés</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Anglais->français, traduction simple</td>
                <td><code>203</code></td>
                <td><code>367</code></td>
                <td><code>468</code></td>
                <td><code>78,4 %</code></td>
                <td><code>121</code></td>
              </tr>
              <tr>
                <td>Anglais->français, génération contrainte</td>
                <td><code>203</code></td>
                <td><code>405</code></td>
                <td><code>468</code></td>
                <td><code>86,5 %</code></td>
                <td><code>144</code></td>
              </tr>
              <tr>
                <td>Anglais->français, masquage + révision</td>
                <td><code>203</code></td>
                <td><code>423</code></td>
                <td><code>468</code></td>
                <td><code>90,4 %</code></td>
                <td><code>159</code></td>
              </tr>
              <tr>
                <td>Français->anglais, génération contrainte</td>
                <td><code>204</code></td>
                <td><code>403</code></td>
                <td><code>474</code></td>
                <td><code>85,0 %</code></td>
                <td><code>139</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          La révision atteint le meilleur taux de termes exacts en anglais vers français, mais au
          prix d'une qualité globale beaucoup plus faible. Le produit accepte donc environ quatre
          points de moins en termes exacts par rapport à la révision pour réduire fortement les
          régressions graves. Le taux français-anglais de
          <code>85,0 %</code> se situe à moins de <code>1,5</code> point du taux anglais-français
          contraint.
        </p>
      </section>

      <section>
        <h3>Analyse des erreurs</h3>
        <p>
          Les régressions graves restantes du chemin contraint étaient concentrées dans la
          surcontrainte de groupes de mots. Par exemple, <code>The Policy</code> pouvait être étendu
          en <code>La Politique sur les services et le numérique</code> lorsque la phrase source
          parlait de la politique de façon générale; <code>service design</code> pouvait être forcé
          dans une formulation localement redondante; et <code>information and data</code> pouvait
          être remplacé d'une manière qui supprimait des prépositions nécessaires.
        </p>
        <p>
          Le chemin contraint français-anglais a montré des dommages semblables, mais propres à la
          direction. Les plus grandes régressions venaient de la promotion excessive de phrases de
          glossaire comme <code>Policy on Service and Digital</code>,
          <code>service delivery</code> et <code>personal information</code> dans des contextes où
          la traduction de base avait une structure plus fluide. La direction est donc
          fonctionnellement prise en charge, mais elle a son propre travail de sécurité au niveau
          des expressions; elle n'est pas sans risque.
        </p>
        <p>
          L'ancien chemin avec révision avait des échecs plus larges et plus graves. Il réécrivait
          des sigles officiels comme <code>ATIP</code>, <code>AIPRP</code>, <code>TBS</code>,
          <code>SCT</code> et <code>GC CIO</code>; supprimait ou réécrivait des noms officiels comme
          <code>Government of Canada</code>; et produisait du français mal formé comme
          <code>changements à venir de réglementaire</code>,
          <code>normes politiques et directives</code> et <code>mettre en uvre</code>.
        </p>
        <p>
          La revue manuelle appuyait le résultat quantitatif : le modèle de révision améliorait
          parfois la fluidité de surface locale, mais il se comportait comme un réécrivain génératif
          plutôt que comme une étape de réparation grammaticale contrainte. C'est dangereux pour un
          texte gouvernemental sensible à la terminologie.
        </p>
      </section>

      <section>
        <h3>Architecture finale</h3>
        <p>
          Le produit livre maintenant seulement le chemin de génération contrainte. Le modèle de
          correction française, l'option de révision, le réglage de précision de révision et la
          deuxième passe de génération ont été retirés. Cela enlève environ
          <code>1,1 Go</code> d'actifs de correction de l'ensemble local et évite une deuxième passe
          de génération pour la sortie anglais-français.
        </p>
        <p>
          L'exécution finale conserve les modèles de traduction
          <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian
          <abbr title="8-bit quantization">q8</abbr>, le stockage du glossaire dans
          <abbr title="Indexed Database">IndexedDB</abbr>, l'importation et l'exportation
          <abbr title="Comma-separated values">CSV</abbr>, l'extraction et la reconstruction des
          documents Office, ainsi que le décodage contraint par glossaire dans le worker de
          traduction.
        </p>
      </section>

      <section>
        <h3>Limites connues</h3>
        <p>
          La génération contrainte par glossaire reste une aide terminologique, pas un
          réentraînement du modèle. Elle améliore l'utilisation moyenne de la terminologie et réduit
          le besoin d'une passe de révision, mais elle peut encore surcontraindre une expression.
          Les textes destinés à la publication, les textes juridiques ou les textes très visibles
          devraient quand même être relus par une personne bilingue.
        </p>
        <p>
          La prochaine amélioration probable est la sécurité au niveau des expressions : distinguer
          les termes stricts des termes préférés, éviter de forcer les titres officiels de
          politiques sauf si le titre exact apparaît dans le contexte source, et préserver les
          articles et les prépositions pendant le remplacement par ancre.
        </p>
      </section>
    </template>

    <template v-else>
      <section>
        <h2>Glossary-constrained local neural machine translation</h2>
        <p>
          This paper documents the experimental path that led from glossary masking and a French
          polish pass to the current constrained-decoding architecture. The current product runs
          <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian translation models locally in the
          browser and applies glossary terms during generation rather than repairing the sentence
          afterward.
        </p>
        <p>
          The conclusion is empirical: the constrained no-polish path improved average quality over
          plain translation and materially outperformed the legacy translate-plus-polish path on an
          independent 300-sentence Government of Canada benchmark.
        </p>
      </section>

      <section class="metric-baseline">
        <h3>How to read the scores</h3>
        <p>
          <abbr title="character n-gram F-score">chrF</abbr> and token
          <abbr title="F-score">F1</abbr> scores run from <code>0</code> to <code>1</code>. Higher
          means the output looks more like the reference translation. In this benchmark, plain
          translations were already around <code>0.74</code>
          <abbr title="character n-gram F-score">chrF</abbr>, so useful average gains are expected
          to be small.
        </p>
        <p>
          A mean increase of <code>0.001</code> or <code>0.002</code>
          <abbr title="character n-gram F-score">chrF</abbr> is not strong evidence by itself for
          any one sentence. It matters when it points in the same direction as the other signals:
          better token <abbr title="F-score">F1</abbr>, more glossary terms found, and far fewer
          severe regressions.
        </p>
        <p>
          The <code>0.01</code> <abbr title="character n-gram F-score">chrF</abbr> threshold is used
          to count rows that changed enough to be noticeable on an individual sentence. It does not
          mean a <code>0.009</code> difference is meaningless; it is a practical cutoff that
          separates small movement from clearer changes.
        </p>
      </section>

      <section>
        <h3>Abstract</h3>
        <p>
          We evaluated glossary strategies for a browser-local translation workspace in both
          English-to-French and French-to-English directions. The English-to-French study compared
          unconstrained <abbr title="Open Parallel Corpus">OPUS</abbr> translation, legacy glossary
          masking followed by a French grammar correction model, and glossary-constrained
          <abbr title="Open Parallel Corpus">OPUS</abbr> generation without a polish pass. The
          legacy method achieved the highest exact glossary hit rate, but it introduced
          substantially more semantic and grammatical regressions. The constrained method improved
          English-to-French <abbr title="character n-gram F-score">chrF</abbr> from
          <code>0.7462</code> to <code>0.7484</code> versus plain translation, improved token
          <abbr title="F-score">F1</abbr> from <code>0.7008</code> to <code>0.7046</code>, and
          reduced severe quality harms from <code>39</code> under legacy polish to <code>4</code>.
        </p>
        <p>
          We then ran the same independent benchmark in the French-to-English direction. Constrained
          decoding improved <abbr title="character n-gram F-score">chrF</abbr> from
          <code>0.7420</code> to <code>0.7430</code> and token <abbr title="F-score">F1</abbr> from
          <code>0.7161</code> to <code>0.7199</code>. French-to-English exact glossary target hit
          rate was <code>85.0%</code>, close to the English-to-French rate of <code>86.5%</code>.
        </p>
        <p>
          The final architecture removes the French correction model and uses a single local
          translation model pass with candidate selection, anchor replacement, soft beam biasing,
          target-variant matching, and safety filters for broad one-word glossary entries.
        </p>
      </section>

      <section>
        <h3>Product Constraints</h3>
        <p>
          The application is a static browser product. Source text and uploaded
          <abbr title="Document file format used by Microsoft Word">DOCX</abbr> or
          <abbr title="Presentation file format used by Microsoft PowerPoint">PPTX</abbr> files stay
          on the user's device. Models are served from site assets, loaded by Transformers.js, and
          executed with <abbr title="Open Neural Network Exchange">ONNX</abbr> Runtime Web in a Web
          Worker. This architecture supports privacy and static hosting, but it makes model size and
          first-load cost central design constraints.
        </p>
        <p>
          The translation layer uses local <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian
          sequence-to-sequence models for English-to-French and French-to-English translation. Each
          direction is packaged as quantized <abbr title="8-bit quantization">q8</abbr>
          <abbr title="Open Neural Network Exchange">ONNX</abbr> weights. The
          <abbr title="Open Neural Network Exchange">ONNX</abbr> files for each
          <abbr title="Open Parallel Corpus">OPUS</abbr> direction are approximately
          <code>133 MB</code>, and each model directory is approximately
          <code>141 MB</code> including tokenizer and configuration assets.
        </p>
        <p>
          We also attempted to move the large benchmark harness to pure Node.js. The bundled browser
          Transformers.js build could be imported in Node, but local model loading and useful
          <abbr title="Open Neural Network Exchange">ONNX</abbr> execution were not practical
          because the bundle excludes <code>onnxruntime-node</code> and its Node device path only
          exposed <abbr title="Central Processing Unit">CPU</abbr> execution. The final benchmark
          therefore used the same browser/<abbr title="WebAssembly">WASM</abbr> execution path as
          the product.
        </p>
      </section>

      <section>
        <h3>Initial Glossary Method</h3>
        <p>
          The first glossary implementation used deterministic masking. The app found enabled
          glossary entries, matched source terms case-insensitively as whole terms, sorted matches
          longest-first, replaced matched source spans with temporary tokens such as
          <code>ZXGLOSS0ZX</code>, translated the masked sentence, and hydrated any returned
          temporary tokens with the target glossary term.
        </p>
        <p>
          This method produced strong exact replacement when the token survived translation. It also
          had predictable failure modes: the model could drop or alter a temporary token, the
          hydrated French term could land in a grammatically awkward position, and separate
          word-level entries could produce wrong French word order. A fallback replaced the exact
          source term only if the original source term remained in the output.
        </p>
      </section>

      <section>
        <h3>French Polish Experiment</h3>
        <p>
          To repair awkward hydrated glossary output, we built a second-pass French correction path.
          The correction model was based on
          <code>PoloHuggingface/French_grammar_error_corrector</code> and converted to local
          <abbr title="Open Neural Network Exchange">ONNX</abbr> with Optimum. We produced both
          <abbr title="4-bit quantization">q4</abbr> and
          <abbr title="8-bit quantization">q8</abbr> variants. The
          <abbr title="4-bit quantization">q4</abbr> variant used embedded single-file
          <abbr title="Open Neural Network Exchange">ONNX</abbr> assets to avoid browser loading
          problems with external <abbr title="Open Neural Network Exchange">ONNX</abbr> data files.
        </p>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Correction asset</th>
                <th scope="col">Precision</th>
                <th scope="col">Files</th>
                <th scope="col">
                  Approximate <abbr title="Open Neural Network Exchange">ONNX</abbr> size
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>French grammar correction</td>
                <td><abbr title="4-bit quantization">q4</abbr></td>
                <td>
                  <code>encoder_model_q4.onnx</code>, <code>decoder_model_merged_q4.onnx</code>
                </td>
                <td><code>322 MB</code></td>
              </tr>
              <tr>
                <td>French grammar correction</td>
                <td><abbr title="8-bit quantization">q8</abbr></td>
                <td>
                  <code>encoder_model_quantized.onnx</code>,
                  <code>decoder_model_merged_quantized.onnx</code>
                </td>
                <td><code>727 MB</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          The correction prompt was prefixed with <code>improve grammar:</code>. In small probes,
          both <abbr title="4-bit quantization">q4</abbr> and
          <abbr title="8-bit quantization">q8</abbr> corrected simple malformed phrases such as
          <code>Cliquez sur le connexion bouton pour commencer.</code> to
          <code>Cliquez sur le bouton de connexion pour commencer.</code>. The same probes exposed
          the risk: the correction model sometimes inferred missing context, changed meaning,
          dropped specialized terms, or rewrote official abbreviations.
        </p>
        <p>
          On the original 20-sentence glossary sample, the translate-plus-polish path produced
          approximately
          <code>13/20</code> exact sentence-level glossary hits. It often improved local fluency,
          but it was not a safe deterministic repair step.
        </p>
      </section>

      <section>
        <h3>Constrained Decoding Design</h3>
        <p>
          We then tested whether the <abbr title="Open Parallel Corpus">OPUS</abbr> model could be
          guided during generation instead of repaired afterward. Transformers.js accepted
          generation configuration fields such as <code>force_words_ids</code>, but local testing
          showed that path did not apply the forced words as a usable generation logits processor
          for our build. We therefore implemented our own experimental logits processors and
          candidate selector in the translation worker.
        </p>
        <p>
          The current constrained path starts with a normal translation of the original source
          sentence. If the baseline already contains all safe glossary targets or accepted variants,
          the baseline is returned. Otherwise, the worker generates candidate outputs using three
          families of evidence:
        </p>
        <ul>
          <li>
            <strong>Anchor replacement:</strong> translate the source glossary phrase by itself,
            derive French anchor variants, find the anchor in the baseline translation, and replace
            only that span with the glossary target.
          </li>
          <li>
            <strong>Soft beam bias:</strong> add positive logit bias to the first token of missing
            glossary targets while suppressing early <abbr title="End of sequence">EOS</abbr>, then
            force continuation tokens only after a glossary phrase has started.
          </li>
          <li>
            <strong>Fallback processors:</strong> append-before-EOS and hard-force processors remain
            available as last-resort candidates, but candidate scoring strongly penalizes degenerate
            or packed-tail outputs.
          </li>
        </ul>
        <p>
          Candidate selection scores glossary coverage, baseline anchor coverage, length ratio,
          terminal punctuation, degenerate repetition, appended-tail risk, packed glossary terms,
          and article/preposition damage. The selector can accept partial glossary coverage when a
          candidate is substantially more fluent than a forced exact output.
        </p>
      </section>

      <section>
        <h3>Safety Filters</h3>
        <p>
          The most important safety change was refusing broad single-word constraints. Early
          300-sentence testing showed severe harms from forcing terms such as <code>policy</code>,
          <code>regulatory</code>, <code>regulation</code>, and <code>accessibility</code>. These
          words are common enough that the model often already has a grammatical contextual
          equivalent; forcing a single target form can break agreement or syntax.
        </p>
        <p>
          The implemented rule constrains glossary entries when the source or target has at least
          two normalized words, or when the target/source looks like a placeholder, acronym,
          digit-bearing term, or camel-case identifier. If no safe constraints remain, the app
          returns the cleaned baseline translation rather than falling back to the old mask/hydrate
          path.
        </p>
        <p>
          The worker also includes target-variant matching for accepted inflections and official
          variants, including plural leave terms, access-control forms, service-level agreement
          variants, procurement policy variants, privacy impact assessment variants, and performance
          review variants.
        </p>
      </section>

      <section>
        <h3>Curated 20-Sentence Results</h3>
        <p>
          Before the independent corpus test, we used a 20-sentence set with escalating glossary
          complexity. The best early no-polish variant reached <code>13/20</code> exact sentence
          hits and <code>42/51</code> exact term matches with better local cleanup but occasional
          trailing fragments. After removing the late-force strategy and improving cleanup and
          safety filters, the no-polish path reached approximately <code>18-19/20</code> usable
          sentence-level glossary outcomes and about <code>48/51</code> exact terms, with no
          packed-tail artifact in the final human-quality pass.
        </p>
        <p>
          This exceeded the old polish benchmark on the same sample, but the sample was too small
          and too tuned to the implementation to justify a product decision. We therefore built an
          independent benchmark from public Government of Canada pages.
        </p>
      </section>

      <section>
        <h3>Government of Canada Benchmark</h3>
        <p>
          The independent benchmark used English/French Canada.ca pages, biased toward Treasury
          Board of Canada Secretariat policies, directives, and guidance. The collection script
          scraped bilingual page pairs, aligned text blocks and sentence candidates, translated
          candidate rows without a glossary in each direction, and accepted only rows whose plain
          translation had sufficient similarity to the published reference in the opposite language.
        </p>
        <p>
          This validation step was necessary because bilingual pages can differ structurally or
          editorially; the benchmark did not assume English and French
          <abbr title="Document Object Model">DOM</abbr> parity was sufficient.
        </p>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Corpus property</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Candidate sentence pairs translated for alignment</td>
                <td><code>600</code></td>
              </tr>
              <tr>
                <td>Accepted benchmark rows per direction</td>
                <td><code>300</code></td>
              </tr>
              <tr>
                <td>Rejected candidate rows, EN->FR</td>
                <td><code>31</code></td>
              </tr>
              <tr>
                <td>Rejected candidate rows, FR->EN</td>
                <td><code>32</code></td>
              </tr>
              <tr>
                <td>Distinct source pages in final sample</td>
                <td><code>5</code></td>
              </tr>
              <tr>
                <td>Rows containing at least one glossary source term, EN->FR</td>
                <td><code>203</code></td>
              </tr>
              <tr>
                <td>Rows containing at least one glossary source term, FR->EN</td>
                <td><code>204</code></td>
              </tr>
              <tr>
                <td>Minimum alignment <abbr title="character n-gram F-score">chrF</abbr></td>
                <td><code>0.45</code></td>
              </tr>
              <tr>
                <td>Minimum alignment token <abbr title="F-score">F1</abbr></td>
                <td><code>0.25</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          The scoring metrics were <abbr title="character n-gram F-score">chrF</abbr> over character
          n-grams 1 through 6, normalized token <abbr title="F-score">F1</abbr>, length-ratio
          distance, rows improved or harmed by more than <code>0.01</code>
          <abbr title="character n-gram F-score">chrF</abbr>, severe harms by z-score against the
          path's delta distribution, and exact normalized glossary target hits as a supplementary
          terminology measure.
        </p>
        <p>
          These measures should be read together: small mean deltas show the direction of the trend,
          while improved, harmed, and severe-harmed row counts show practical risk on individual
          sentences.
        </p>
      </section>

      <section>
        <h3>300-Sentence Quality Results</h3>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Direction and path</th>
                <th scope="col">Mean <abbr title="character n-gram F-score">chrF</abbr></th>
                <th scope="col">Mean token <abbr title="F-score">F1</abbr></th>
                <th scope="col">
                  <abbr title="character n-gram F-score">chrF</abbr> delta vs plain
                </th>
                <th scope="col">Improved rows</th>
                <th scope="col">Harmed rows</th>
                <th scope="col">Severe harmed rows</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>EN->FR plain translation</td>
                <td><code>0.7462</code></td>
                <td><code>0.7008</code></td>
                <td>n/a</td>
                <td>n/a</td>
                <td>n/a</td>
                <td>n/a</td>
              </tr>
              <tr>
                <td>EN->FR constrained, no polish</td>
                <td><code>0.7484</code></td>
                <td><code>0.7046</code></td>
                <td><code>+0.0021</code></td>
                <td><code>19</code></td>
                <td><code>9</code></td>
                <td><code>4</code></td>
              </tr>
              <tr>
                <td>EN->FR legacy mask/hydrate + polish</td>
                <td><code>0.7321</code></td>
                <td><code>0.6829</code></td>
                <td><code>-0.0142</code></td>
                <td><code>56</code></td>
                <td><code>115</code></td>
                <td><code>39</code></td>
              </tr>
              <tr>
                <td>FR->EN plain translation</td>
                <td><code>0.7420</code></td>
                <td><code>0.7161</code></td>
                <td>n/a</td>
                <td>n/a</td>
                <td>n/a</td>
                <td>n/a</td>
              </tr>
              <tr>
                <td>FR->EN constrained</td>
                <td><code>0.7430</code></td>
                <td><code>0.7199</code></td>
                <td><code>+0.0010</code></td>
                <td><code>23</code></td>
                <td><code>11</code></td>
                <td><code>10</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          For English-to-French, the constrained path beat legacy polish by more than
          <code>0.01</code> <abbr title="character n-gram F-score">chrF</abbr> on
          <code>116</code> rows. Legacy polish beat constrained decoding by more than
          <code>0.01</code> <abbr title="character n-gram F-score">chrF</abbr> on
          <code>48</code> rows. The mean constrained-minus-polish
          <abbr title="character n-gram F-score">chrF</abbr> delta was <code>+0.0163</code>. We did
          not run a French-to-English polish comparison because the polish model was French-only;
          the relevant parity question for French-to-English is plain
          <abbr title="Open Parallel Corpus">OPUS</abbr> versus constrained glossary decoding.
        </p>
      </section>

      <section>
        <h3>Terminology Results</h3>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">Direction and path</th>
                <th scope="col">Glossary rows</th>
                <th scope="col">Exact target hits</th>
                <th scope="col">Total terms</th>
                <th scope="col">Term hit rate</th>
                <th scope="col">Rows with all terms hit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>EN->FR plain translation</td>
                <td><code>203</code></td>
                <td><code>367</code></td>
                <td><code>468</code></td>
                <td><code>78.4%</code></td>
                <td><code>121</code></td>
              </tr>
              <tr>
                <td>EN->FR constrained</td>
                <td><code>203</code></td>
                <td><code>405</code></td>
                <td><code>468</code></td>
                <td><code>86.5%</code></td>
                <td><code>144</code></td>
              </tr>
              <tr>
                <td>EN->FR legacy mask/hydrate + polish</td>
                <td><code>203</code></td>
                <td><code>423</code></td>
                <td><code>468</code></td>
                <td><code>90.4%</code></td>
                <td><code>159</code></td>
              </tr>
              <tr>
                <td>FR->EN constrained</td>
                <td><code>204</code></td>
                <td><code>403</code></td>
                <td><code>474</code></td>
                <td><code>85.0%</code></td>
                <td><code>139</code></td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
        <p>
          Legacy polish achieved the highest English-to-French exact target hit rate. However, it
          did so while lowering overall translation quality. The product decision therefore accepts
          about a four percentage point reduction in exact target hits versus polish in exchange for
          far fewer severe translation regressions. The French-to-English constrained hit rate of
          <code>85.0%</code> is within <code>1.5</code> percentage points of the English-to-French
          constrained rate.
        </p>
      </section>

      <section>
        <h3>Error Analysis</h3>
        <p>
          The constrained path's remaining severe harms were concentrated in multiword
          overconstraint. Examples included expanding <code>The Policy</code> into
          <code>La Politique sur les services et le numérique</code> when the source sentence
          referred generically to the policy, forcing <code>service design</code> into a locally
          redundant phrase, and replacing <code>information and data</code> in a way that removed
          necessary prepositions.
        </p>
        <p>
          The French-to-English constrained path showed similar but direction-specific harms. The
          largest regressions came from over-promoting glossary phrases such as
          <code>Policy on Service and Digital</code>, <code>service delivery</code>, and
          <code>personal information</code> into contexts where the baseline translation had a more
          fluent structure. The direction is therefore functionally supported, but it has its own
          phrase-level safety work rather than being risk-free.
        </p>
        <p>
          The legacy polish path had broader and more serious failures. It rewrote official acronyms
          such as
          <code>ATIP</code>, <code>AIPRP</code>, <code>TBS</code>, <code>SCT</code>, and
          <code>GC CIO</code>; dropped or rewrote official names such as
          <code>Government of Canada</code>; and produced malformed French such as
          <code>changements à venir de réglementaire</code>,
          <code>normes politiques et directives</code>, and <code>mettre en uvre</code>.
        </p>
        <p>
          Manual review supported the quantitative result: the polish model sometimes improved local
          surface fluency, but it behaved like a generative rewriter rather than a constrained
          grammar repair step. That is unsafe for terminology-sensitive government text.
        </p>
      </section>

      <section>
        <h3>Final Architecture</h3>
        <p>
          The product now ships only the constrained translation path. It no longer includes the
          French correction model, the polish UI, the polish precision setting, or the second model
          pass. This removes approximately
          <code>1.1 GB</code> of correction model artifacts from the local asset set and eliminates
          a second generation pass for English-to-French output.
        </p>
        <p>
          The final runtime keeps the <abbr title="Open Parallel Corpus">OPUS</abbr>/Marian
          <abbr title="8-bit quantization">q8</abbr> translation models, glossary storage in
          <abbr title="Indexed Database">IndexedDB</abbr>,
          <abbr title="Comma-separated values">CSV</abbr> import/export, Office document extraction
          and reconstruction, and constrained glossary decoding in the translation worker.
        </p>
      </section>

      <section>
        <h3>Known Limits</h3>
        <p>
          Glossary-constrained generation is still terminology assistance, not model retraining. It
          improves average terminology use and reduces the need for a polish pass, but it can still
          overconstrain a phrase. Publication-quality, legal, or high-visibility text should still
          be reviewed by a bilingual human.
        </p>
        <p>
          The next likely improvement is phrase-level safety: distinguish strict terms from
          preferred terms, avoid forcing official policy titles unless the exact title appears in
          the source context, and preserve articles and prepositions during anchor replacement.
        </p>
      </section>
    </template>

    <section id="methodology-definitions" class="definitions" tabindex="-1">
      <h3>{{ locale === 'fr' ? 'Définitions' : 'Definitions' }}</h3>

      <dl v-if="locale === 'fr'">
        <div>
          <dt>chrF</dt>
          <dd>
            Une note qui compare deux textes en regardant de petits groupes de lettres. Une note
            plus haute veut dire que la traduction ressemble davantage à la référence.
          </dd>
        </div>
        <div>
          <dt>F1 lexical</dt>
          <dd>
            Une note qui vérifie si la traduction utilise les bons mots. Elle équilibre les mots
            corrects trouvés et les mots incorrects ou manquants.
          </dd>
        </div>
        <div>
          <dt>OPUS/Marian</dt>
          <dd>
            Une famille de modèles de traduction entraînés avec de grands ensembles de textes déjà
            traduits.
          </dd>
        </div>
        <div>
          <dt>ONNX</dt>
          <dd>
            Un format de fichier qui permet d'exécuter un modèle d'intelligence artificielle dans
            différents outils, y compris dans un navigateur.
          </dd>
        </div>
        <div>
          <dt>q4 et q8</dt>
          <dd>
            Des versions compressées d'un modèle. q4 est plus petit, q8 est souvent plus précis,
            mais les deux visent à réduire la taille des fichiers.
          </dd>
        </div>
        <div>
          <dt>WASM</dt>
          <dd>
            Une technologie qui permet au navigateur d'exécuter du code rapide, presque comme une
            application installée.
          </dd>
        </div>
        <div>
          <dt>Web Worker</dt>
          <dd>
            Une tâche en arrière-plan dans le navigateur. Elle permet de traduire sans bloquer
            l'interface.
          </dd>
        </div>
        <div>
          <dt>EOS</dt>
          <dd>Le signal que le modèle utilise pour dire qu'il a terminé une phrase.</dd>
        </div>
        <div>
          <dt>DOM</dt>
          <dd>
            La structure qu'un navigateur crée à partir d'une page Web. Le code peut lire cette
            structure pour trouver les titres, paragraphes et tableaux.
          </dd>
        </div>
        <div>
          <dt>CSV</dt>
          <dd>
            Un fichier texte simple qui contient des lignes et des colonnes. Il est souvent ouvert
            dans un tableur.
          </dd>
        </div>
        <div>
          <dt>IndexedDB</dt>
          <dd>
            Un espace de stockage dans le navigateur. Ici, il sert à garder les glossaires sur
            l'appareil.
          </dd>
        </div>
      </dl>

      <dl v-else>
        <div>
          <dt>chrF</dt>
          <dd>
            A score that compares two texts by looking at small groups of letters. A higher score
            means the translation looks more like the reference text.
          </dd>
        </div>
        <div>
          <dt>token F1</dt>
          <dd>
            A score that checks whether the translation uses the right words. It balances words that
            were found correctly against words that were wrong or missing.
          </dd>
        </div>
        <div>
          <dt>OPUS/Marian</dt>
          <dd>
            A family of translation models trained on large collections of text that already has
            translations.
          </dd>
        </div>
        <div>
          <dt>ONNX</dt>
          <dd>
            A file format that lets an artificial intelligence model run in different tools,
            including in a browser.
          </dd>
        </div>
        <div>
          <dt>q4 and q8</dt>
          <dd>
            Compressed versions of a model. q4 is smaller, q8 is often more accurate, and both are
            meant to reduce file size.
          </dd>
        </div>
        <div>
          <dt>WASM</dt>
          <dd>
            A technology that lets the browser run fast code, closer to how an installed app runs.
          </dd>
        </div>
        <div>
          <dt>Web Worker</dt>
          <dd>
            A background task in the browser. It lets translation run without freezing the page.
          </dd>
        </div>
        <div>
          <dt>EOS</dt>
          <dd>The signal the model uses to say it has finished a sentence.</dd>
        </div>
        <div>
          <dt>DOM</dt>
          <dd>
            The structure a browser builds from a Web page. Code can read it to find headings,
            paragraphs, and tables.
          </dd>
        </div>
        <div>
          <dt>CSV</dt>
          <dd>
            A simple text file with rows and columns. People often open it in spreadsheet software.
          </dd>
        </div>
        <div>
          <dt>IndexedDB</dt>
          <dd>Storage inside the browser. This app uses it to keep glossaries on the device.</dd>
        </div>
      </dl>
    </section>

    <section class="benchmark-pairs">
      <h3>
        {{ locale === 'fr' ? 'Paires de phrases du banc d’essai' : 'Benchmark Sentence Pairs' }}
      </h3>
      <p v-if="locale === 'fr'">
        Le banc d’essai Canada.ca utilise ces <code>{{ gocBenchmarkPairs.length }}</code> paires
        anglais-français comme corpus source/référence. Les mêmes paires servent aux deux directions
        : anglais vers français et français vers anglais.
      </p>
      <p v-else>
        The Canada.ca benchmark uses these <code>{{ gocBenchmarkPairs.length }}</code>
        English-French pairs as the source/reference corpus. The same pairs are used in both
        directions: English to French and French to English.
      </p>
      <TableWrap>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{{ locale === 'fr' ? 'Anglais' : 'English' }}</th>
              <th scope="col">{{ locale === 'fr' ? 'Français' : 'French' }}</th>
              <th scope="col">{{ locale === 'fr' ? 'Page source' : 'Source page' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pair in gocBenchmarkPairs" :key="pair.id">
              <td>
                <code>{{ pair.id }}</code>
              </td>
              <td>{{ pair.english }}</td>
              <td>{{ pair.french }}</td>
              <td>
                <a
                  :href="locale === 'fr' ? pair.frenchUrl : pair.pageUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ pair.pageTitle }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
    </section>

    <p class="text-xs text-gray-600">
      {{ locale === 'fr' ? 'Date de modification : 2026-05-28' : 'Date modified: 2026-05-28' }}
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { gocBenchmarkPairs } from '@/data/benchmark-pairs'
import { normalizeLocale } from '@/utils/i18n'

const TableWrap = defineComponent({
  name: 'TableWrap',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'overflow-x-auto rounded-md border border-gray-200' }, slots.default?.())
  },
})

const route = useRoute()
const locale = computed(() => normalizeLocale(route.params.locale))
</script>

<style scoped>
.methodology section {
  display: grid;
  gap: 0.75rem;
}

.definition-link {
  width: fit-content;
  border-radius: 0.25rem;
  color: rgb(29 78 216);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.1875rem;
}

.methodology h2 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
}

.methodology h3 {
  font-size: 1.125rem;
  font-weight: 650;
  line-height: 1.35;
}

.methodology p,
.methodology li {
  color: rgb(55 65 81);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.methodology ul {
  display: grid;
  gap: 0.5rem;
  list-style: disc;
  padding-left: 1.25rem;
}

.methodology code {
  border-radius: 0.25rem;
  background: rgb(243 244 246);
  color: rgb(17 24 39);
  font-size: 0.875em;
  padding: 0.0625rem 0.25rem;
}

.methodology abbr {
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 0.1875rem;
}

.methodology table {
  min-width: 44rem;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.methodology th,
.methodology td {
  border-bottom: 1px solid rgb(229 231 235);
  padding: 0.75rem;
  text-align: left;
  vertical-align: top;
}

.methodology th {
  background: rgb(249 250 251);
  color: rgb(17 24 39);
  font-weight: 650;
}

.methodology tr:last-child th,
.methodology tr:last-child td {
  border-bottom: 0;
}

.benchmark-pairs a {
  color: rgb(29 78 216);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.1875rem;
}

.definitions,
.benchmark-pairs {
  scroll-margin-top: 2rem;
  border-top: 1px solid rgb(229 231 235);
  padding-top: 1.5rem;
}

.definitions dl {
  display: grid;
  gap: 0.75rem;
}

.definitions dl > div {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.375rem;
  background: rgb(249 250 251);
  padding: 0.875rem;
}

.definitions dt {
  color: rgb(17 24 39);
  font-size: 0.9375rem;
  font-weight: 700;
}

.definitions dd {
  color: rgb(55 65 81);
  font-size: 0.9375rem;
  line-height: 1.6;
}
</style>
