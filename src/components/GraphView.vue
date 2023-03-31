<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.main-container {
  height: 100vh;
  width: 100vw;
  position: relative;
}

#sigma-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

#positions-buttons,
#controls-buttons {
  position: absolute;
  z-index: 10;
}

#positions-buttons {
  right: 1em;
  top: 1em;
}

#controls-buttons {
  display: flex;
  flex-direction: column;
  left: 1em;
  bottom: 1em;
}

button {
  outline: none;
  border-radius: 2px;
  cursor: pointer;
  margin: 5px;
}

#search {
  position: absolute;
  top: 1em;
  left: 1em;
}

#search-input {
  border-radius: 5px;
}

.btn {
  height: 100%;
}

.tag-filter-window {
  position: absolute;
  bottom: 20px;
  right: 20px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 10px;
  background-color: #f8f9fa;
}

.tag-filter {
  display: block;
  margin-bottom: 5px;
}

.form-check-label {
  margin-left: 5px;
  font-weight: normal;
}
</style>

<template>
  <div class="main-container">
    <div ref="container" id="sigma-container"></div>

    <div id="buttons">
      <div id="positions-buttons">
        <button type="button" class="btn btn-outline-dark" v-on:click="random">
          <i class="bi bi-shuffle"></i> Random
        </button>
        <button
          type="button"
          class="btn btn-outline-dark"
          v-on:click="toggleFA2Layout"
        >
          <i class="bi bi-pause-circle"></i> Force Atlas
        </button>
        <button
          type="button"
          class="btn btn-outline-dark"
          v-on:click="circularLayout"
        >
          <i class="bi bi-circle"></i> Circle
        </button>
      </div>
      <div id="controls-buttons">
        <button type="button" class="btn btn-secondary" v-on:click="zoomIn">
          <i class="bi bi-plus-circle-fill"></i> Zoom in
        </button>
        <button type="button" class="btn btn-secondary" v-on:click="zoomOut">
          <i class="bi bi-dash-circle-fill"></i> Zoom out
        </button>
        <button type="button" class="btn btn-secondary" v-on:click="resetZoom">
          <i class="bi bi-arrow-clockwise"></i> Reset zoom
        </button>
      </div>
    </div>
    <div id="search">
      <input
        type="search"
        ref="searchInput"
        id="search-input"
        list="suggestions"
        placeholder="Rechercher un noeud..."
      />
      <datalist ref="suggestions" id="suggestions"></datalist>
    </div>
    <div class="tag-filter-window">
      <h3><u>Categories</u></h3>
      <div v-for="tag in uniqueTags" :key="tag" class="tag-filter form-check">
        <input
          class="form-check-input"
          type="checkbox"
          :id="`tag-${tag}`"
          :value="tag"
          v-model="checkedTags"
          @change="toggleNodeByTag(tag)"
          checked
        />
        <label class="form-check-label" :for="`tag-${tag}`">{{ tag }}</label>
      </div>
    </div>
  </div>
</template>

<script>
import Graph, { DirectedGraph } from "graphology";
import Sigma from "sigma";
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";
import NodeProgramBorder from "./node.border";
import iwanthue from "iwanthue";
import { PlainObject } from "sigma/types";
import eurov2 from "../assets/eurov2.json";
import beers from "../assets/beers.json";
import breweries from "../assets/breweries.json";
import categories from "../assets/categories.json";
import data from "../assets/data.json";
import datasetv2 from "../assets/datasetv2.json";
import { circular, random } from "graphology-layout";
import { animateNodes } from "sigma/utils/animate";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";

export default {
  name: "GraphView",
  data: () => ({
    graph: null,
    camera: null,
    renderer: null,
    uniqueTags: [],
    checkedTags: [
      "Tool",
      "Chart type",
      "Concept",
      "Method",
      "Field",
      "Technology",
      "List",
      "Person",
      "Company",
      "Organization",
      "unknown",
    ],
  }),
  mounted() {
    this.rendering();
  },
  methods: {
    // This function displays a graph based on the action provided

    // and clears any previous graph data
    // displayGraph(action) {
    //   const beerGraphData = this.beerGraphLoader();
    //   switch (action) {
    //     case "action1":
    //       this.graph.clear(); // Clear the graph
    //       this.searchSuggestions.innerHTML = ""; // Clear search suggestions list
    //       this.graph.import(data); // Import data for action1
    //       break;

    //     case "action2":
    //       this.graph.clear(); // Clear the graph
    //       this.searchSuggestions.innerHTML = ""; // Clear search suggestions list
    //       this.graph.import(eurov2); // Import data for action2
    //       break;

    //     case "action3":
    //       this.graph.clear(); // Clear the graph
    //       this.searchSuggestions.innerHTML = ""; // Clear search suggestions list
    //       this.graph.import(beerGraphData); // Import data for action3
    //       break;
    //   }
    // },

    // Zoom in the graph
    zoomIn() {
      // Animate the zoom in process with a duration of 600ms
      this.camera.animatedZoom({ duration: 600 });
    },

    // Zoom out of the graph
    zoomOut() {
      // Animate the zoom out process with a duration of 600ms
      this.camera.animatedUnzoom({ duration: 600 });
    },

    // Reset the zoom level of the graph
    resetZoom() {
      // Animate the zoom reset process with a duration of 600ms
      this.camera.animatedReset({ duration: 600 });
    },

    // Start the ForceAtlas2 layout algorithm
    startFA2() {
      // If there's any previous animation running, cancel it
      if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();
      // Start the ForceAtlas2 layout algorithm
      this.fa2Layout.start();
    },

    // Stop the ForceAtlas2 layout algorithm
    stopFA2() {
      // Stop the ForceAtlas2 layout algorithm
      this.fa2Layout.stop();
    },
    // Toggle the ForceAtlas2 layout algorithm on or off
    toggleFA2Layout() {
      // If the layout algorithm is running, stop it; otherwise, start it
      this.fa2Layout.isRunning() ? this.stopFA2() : this.startFA2();
    },
    // Assign random positions to the nodes in the graph
    random() {
      // Stop the layout algorithm if it is running, and stop any previous animation
      if (this.fa2Layout.isRunning()) this.stopFA2();
      if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();

      // Calculate positions extents to keep positions scale uniform between layouts
      const xExtents = { min: 0, max: 0 };
      const yExtents = { min: 0, max: 0 };
      this.graph.forEachNode((node, attributes) => {
        xExtents.min = Math.min(attributes.x, xExtents.min);
        xExtents.max = Math.max(attributes.x, xExtents.max);
        yExtents.min = Math.min(attributes.y, yExtents.min);
        yExtents.max = Math.max(attributes.y, yExtents.max);
      });

      // Create random positions respecting position extents
      const randomPositions = {};
      this.graph.forEachNode((node) => {
        randomPositions[node] = {
          x: Math.random() * (xExtents.max - xExtents.min),
          y: Math.random() * (yExtents.max - yExtents.min),
        };
      });

      // Use sigma animation to update new positions
      this.cancelCurrentAnimation = animateNodes(this.graph, randomPositions, {
        duration: 2000,
      });
    },
    // Apply a circular layout algorithm to the nodes of a graph
    circularLayout() {
      // Stop the layout algorithm if it is running and any previous animation
      if (this.fa2Layout.isRunning()) this.stopFA2();
      if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();

      // Generate positions for the nodes using the circular layout algorithm
      const circularPositions = circular(this.graph, { scale: 100 });

      // Animate the nodes to their new positions using the positions generated by the circular layout algorithm
      this.cancelCurrentAnimation = animateNodes(
        this.graph,
        circularPositions,
        {
          duration: 2000,
          easing: "linear",
        }
      );
    },
    // Set up mouse events for dragging nodes in the graph
    dragDrop() {
      let draggedNode = null;
      let isDragging = false;

      // On mouse down on a node, enable the drag mode, save the dragged node, highlight the node, and disable the camera
      this.renderer.on("downNode", (e) => {
        isDragging = true;
        draggedNode = e.node;
        this.graph.setNodeAttribute(draggedNode, "highlighted", true);
      });

      // On mouse move, if the drag mode is enabled, change the position of the draggedNode
      this.renderer.getMouseCaptor().on("mousemovebody", (e) => {
        if (!isDragging || !draggedNode) return;

        // Get new position of node and change position of dragged node
        const pos = this.renderer.viewportToGraph(e);
        this.graph.setNodeAttribute(draggedNode, "x", pos.x);
        this.graph.setNodeAttribute(draggedNode, "y", pos.y);

        // Prevent sigma from moving the camera, prevent default browser behavior, and prevent event bubbling
        e.preventSigmaDefault();
        e.original.preventDefault();
        e.original.stopPropagation();
      });

      // On mouse up, reset the autoscale, the dragging mode, and unhighlight the dragged node
      this.renderer.getMouseCaptor().on("mouseup", () => {
        if (draggedNode) {
          this.graph.removeNodeAttribute(draggedNode, "highlighted");
        }
        isDragging = false;
        draggedNode = null;
      });

      // Disable the autoscale at the first down interaction
      this.renderer.getMouseCaptor().on("mousedown", () => {
        if (!this.renderer.getCustomBBox()) {
          this.renderer.setCustomBBox(this.renderer.getBBox());
        }
      });
    },
    // Update the search query for the graph
    setSearchQuery(query) {
      this.state.searchQuery = query;
      if (this.searchInput.value !== query) this.searchInput.value = query;

      if (query) {
        const lcQuery = query.toLowerCase();

        // Get matching nodes with their ids and labels
        const suggestions = this.graph
          .nodes()
          .map((n) => ({
            id: n,
            label: this.graph.getNodeAttribute(n, "label"),
          }))
          .filter(({ label }) => label.toLowerCase().includes(lcQuery));

        // If there is a single perfect match, select that node and move the camera to center on it
        if (suggestions.length === 1 && suggestions[0].label === query) {
          this.state.selectedNode = suggestions[0].id;
          this.state.suggestions = undefined;

          const nodePosition = this.renderer.getNodeDisplayData(
            this.state.selectedNode
          );
          this.renderer.getCamera().animate(nodePosition, {
            duration: 500,
          });
        }
        // If there are multiple or no matches, display the list of suggestions
        else {
          this.state.selectedNode = undefined;
          this.state.suggestions = new Set(suggestions.map(({ id }) => id));
        }
      }
      // If the query is empty, reset the selectedNode and suggestions state properties
      else {
        this.state.selectedNode = undefined;
        this.state.suggestions = undefined;
      }

      // Refresh the renderer to reflect the updated state
      this.renderer.refresh();
    },
    // This function updates the application state to set the hovered node and its neighbors
    setHoveredNode(node) {
      // If a node is provided, update the state to set the hovered node and its neighbors.
      if (node) {
        this.state.hoveredNode = node; // Set the hovered node in the state
        this.state.hoveredNeighbors = new Set(this.graph.neighbors(node)); // Get the neighbors of the hovered node and store them in the state as a Set
      } else {
        // If no node is provided, reset the state
        this.state.hoveredNode = undefined;
        this.state.hoveredNeighbors = undefined;
      }
      this.renderer.refresh(); // Refresh the rendering to update the visualization
    },

    // This function provides search functionality for nodes in a graph
    nodeSearch() {
      // Clear search suggestions list
      this.searchSuggestions.innerHTML = "";

      // Generate search suggestions list based on the graph's nodes
      this.searchSuggestions.innerHTML = this.graph
        .nodes()
        .map(
          (node) =>
            `<option value="${this.graph.getNodeAttribute(
              node,
              "label"
            )}"></option>`
        )
        .join("\n");

      // Bind search input interactions
      this.searchInput.addEventListener("input", () => {
        // On input, set the search query based on the input value
        this.setSearchQuery(this.searchInput.value || "");
      });
      this.searchInput.addEventListener("blur", () => {
        // On blur, reset the search query
        this.setSearchQuery("");
      });

      // Bind graph interactions
      this.renderer.on("enterNode", ({ node }) => {
        // When the mouse enters a node, set it as the hovered node and set its neighbors as the hovered neighbors
        this.setHoveredNode(node);
      });
      this.renderer.on("leaveNode", () => {
        // When the mouse leaves a node, unset the hovered node and the hovered neighbors
        this.setHoveredNode(undefined);
      });

      // Set node and edge rendering based on the state
      this.renderer.setSetting("nodeReducer", (node, data) => {
        const res = Object.assign({}, data);

        // If the node is not the hovered node or its neighbor and is not the selected node, hide the label and change the color to light grey
        if (
          this.state.hoveredNeighbors &&
          !this.state.hoveredNeighbors.has(node) &&
          this.state.hoveredNode !== node
        ) {
          res.label = "";
          res.color = "#f6f6f6";
        }
        // If the node is the selected node, highlight it
        if (this.state.selectedNode === node) {
          res.highlighted = true;
        }
        // If the node is not in the suggestions list, hide the label and change the color to light grey
        else if (this.state.suggestions && !this.state.suggestions.has(node)) {
          res.label = "";
          res.color = "#f6f6f6";
        }

        return res;
      });
      this.renderer.setSetting("edgeReducer", (edge, data) => {
        const res = Object.assign({}, data);

        // If the edge does not involve the hovered node, hide it
        if (
          this.state.hoveredNode &&
          !this.graph.hasExtremity(edge, this.state.hoveredNode)
        ) {
          res.hidden = true;
        }
        // If the edge is not connected to nodes in the suggestions list, hide it
        if (
          this.state.suggestions &&
          (!this.state.suggestions.has(this.graph.source(edge)) ||
            !this.state.suggestions.has(this.graph.target(edge)))
        ) {
          res.hidden = true;
        }

        return res;
      });
    },

    // This function converts the input JSON object to a format that is compatible with Sigma.js.
    formatJsonForSigma(inputJson) {
      // Initialize an output object with empty arrays for nodes and edges.
      const output = {
        nodes: [],
        edges: [],
      };

      // If inputJson has a 'nodes' property, process each node in the array.
      if (inputJson.nodes) {
        output.nodes = inputJson.nodes.map((node) => {
          // If a node has an 'attributes' property, use it. Otherwise, use an empty object.
          const attributes = node.attributes || {};
          const tag = attributes.tag;

          // Return a new node object with a key and attributes.
          return {
            key: node.key,
            type: "image",
            attributes: {
              ...attributes, // Spread the attributes object to include its properties.
              label: attributes.label || "Unnamed", // Use the label if it exists, or "Unnamed" if it doesn't.
              x: attributes.x || 0, // Use the x-coordinate if it exists, or 0 if it doesn't.
              y: attributes.y || 0, // Use the y-coordinate if it exists, or 0 if it doesn't.
              size: attributes.size || 1, // Use the size if it exists, or 1 if it doesn't.
              color: attributes.color || "#667", // Use the color if it exists, or "#667" if it doesn't.
              tag: tag, // Ajoutez cette ligne pour inclure le tag dans les attributs du nœud
              url: this.getImageFromTag(tag), // Ajoutez cette ligne pour définir l'URL de l'image en fonction du tag
            },
          };
        });
      }

      // If inputJson has an 'edges' property, process each edge in the array.
      if (inputJson.edges) {
        output.edges = inputJson.edges.map((edge, index) => {
          // Extract the source and target nodes for the edge.
          const source = edge.source;
          const target = edge.target;

          // Return a new edge object with a key, source, target, and attributes.
          return {
            key: `edge_${index}`, // Create a unique key for the edge based on its index in the array.
            source: source,
            target: target,
            attributes: {
              size: 1, // Set the size of the edge to 1.
            },
          };
        });
      }

      // Return the output object containing the processed nodes and edges.
      return output;
    },

    // This function calculates the size of a node based on its score.
    getNodeSize(score) {
      const minSize = 3; // Define the minimum size for a node.
      const maxSize = 1000; // Define the maximum size for a node.
      return Math.max(minSize, score * maxSize); // Calculate the node size based on its score and maxSize.
    },

    // This function converts HSL color values to RGB color values.
    hslToRgb(h, s, l) {
      let r, g, b;

      // If the saturation is 0, the color is grayscale (achromatic).
      if (s === 0) {
        r = g = b = l;
      } else {
        // This inner function converts hue, saturation, and lightness values to an RGB color component.
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      // Return the RGB color values as an array of rounded integers.
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    // This function converts RGB color values to a HEX color string.
    rgbToHex(r, g, b) {
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    },

    // This function generates a color for a given cluster based on the total number of clusters.
    generateColor(cluster, totalClusters) {
      const hue = (cluster * 360) / totalClusters;
      const saturation = 0.8;
      const lightness = 0.5;

      // Convert the HSL color values to RGB color values.
      const [r, g, b] = this.hslToRgb(hue / 360, saturation, lightness);
      // Convert the RGB color values to a HEX color string.
      return this.rgbToHex(r, g, b);
    },

    // This function updates the color and size attributes of nodes in the formatted JSON object.
    updateNodeColorsAndSize(formattedJson) {
      // Create a Set of unique cluster values from the nodes' attributes.
      const clusters = new Set(
        formattedJson.nodes.map((node) => node.attributes.cluster)
      );
      const totalClusters = clusters.size;

      // For each node, update its color and size attributes based on its cluster and score values.
      formattedJson.nodes.forEach((node) => {
        const { cluster, score, tag } = node.attributes;
        node.attributes.color = this.generateColor(cluster, totalClusters);
        node.attributes.size = this.getNodeSize(score);
        node.attributes.url = this.getImageFromTag(tag);
      });

      // Return the updated formatted JSON object.
      return formattedJson;
    },

    // This function fills the uniqueTags array with all the different nodes' tags.
    extractUniqueTags() {
      // Filter nodes that have a "tag" attribute.
      const taggedNodes = this.graph.filterNodes((node, attributes) => {
        return Object.prototype.hasOwnProperty.call(attributes, "tag");
      });

      // Create a new Set to store unique tags.
      this.uniqueTags = new Set();

      // Iterate through the tagged nodes and add their tags to the uniqueTags Set.
      taggedNodes.forEach((node) => {
        const tag = this.graph.getNodeAttributes(node).tag;
        this.uniqueTags.add(tag);
      });

      // Convert the uniqueTags Set to an array and store it in the "tags" property.
      this.tags = Array.from(this.uniqueTags);

      // Return the array of unique tags.
      return this.tags;
    },

    // This function toggles the visibility of nodes based on their tag.
    toggleNodeByTag(tag) {
      // Filter nodes that have the specified tag.
      const nodesToToggle = this.graph.filterNodes((node, attributes) => {
        return attributes.tag === tag;
      });

      // Iterate through the nodes to toggle and update their attributes.
      nodesToToggle.forEach((node) => {
        const nodeAttributes = this.graph.getNodeAttributes(node);

        if (!nodeAttributes.hidden) {
          // Hide the node.
          this.graph.updateNodeAttributes(node, (currentAttributes) => {
            return {
              ...currentAttributes,
              hidden: true,
              prevColor: nodeAttributes.color, // Store the current color before hiding the node.
              color: null, // Set the color to null to hide the node.
            };
          });
        } else {
          // Show the node.
          this.graph.updateNodeAttributes(node, (currentAttributes) => {
            return {
              ...currentAttributes,
              hidden: false,
              color: nodeAttributes.prevColor, // Restore the previous color to show the node.
            };
          });
        }
      });

      // Refresh the renderer to apply the changes.
      this.renderer.refresh();
    },

    getImageFromTag(tag) {
      // Map tags to their corresponding image URLs
      const tagToImageMap = {
        'Tool': "../assets/image/tool.png",
        'Chart type': "../assets/images/chart-type.png",
        'Concept': "../assets/images/concept.png",
        'Method': "../assets/images/method.png",
        'Field': "../assets/images/field.png",
        'Technology': "../assets/images/technology.png",
        'List': "../assets/images/list.png.png",
        'Person': "../assets/images/person.png",
        'Company': "../assets/images/company.png",
        'Organization': "../assets/images/organization.png",
        'unknown': "../assets/images/unknown.png",
      };

      return tagToImageMap[tag] || "path/to/default/image.png"; // Return the image for the given tag or a default image if no image is found for the tag
    },

    //This function perfoms various tasks related to rendering and displaying the graph
    rendering() {
      // Retrieve DOM elements
      let container = this.$refs.container; // Get the container element from the component's refs
      let searchInput = this.$refs.searchInput; // Get the search input element from the component's refs
      this.searchInput = searchInput; // Assign the search input element to the component's state for later use
      let searchSuggestions = this.$refs.suggestions; // Get the search suggestions element from the component's refs
      this.searchSuggestions = searchSuggestions; // Assign the search suggestions element to the component's state for later use

      // Declare constants
      const state = { searchQuery: "" }; // Declare an object to hold the search query state
      this.state = state; // Assign the state object to the component's state
      const graph = new Graph({ multi: true }); // Create a new graph object with the multi option set to true, allowing multiple edges between two nodes
      this.graph = graph; // Assign the graph object to the component's state for later use

      // Call the displayGraph method to show the graph with the "action1" parameter
      // this.displayGraph("action1");
      const wiki = this.formatJsonForSigma(datasetv2);
      const wiki2 = this.updateNodeColorsAndSize(wiki);

      graph.import(wiki2);

      // Declare settings and create a new instance of the FA2 algorithm
      const sensibleSettings = forceAtlas2.inferSettings(graph); // Use the forceAtlas2 library to infer sensible settings for the FA2 algorithm based on the graph
      this.fa2Layout = new FA2Layout(graph, {
        settings: sensibleSettings, // Use the sensible settings for the algorithm
      });
      this.cancelCurrentAnimation = null;

      // Declare the sigma renderer and provide attributes for rendering nodes
      let renderer = new Sigma(graph, container, {
        nodeProgramClasses: {
          image: getNodeProgramImage(), // Get the node image program
        },
        renderEdgeLabels: true, // Set the renderer to display edge labels
        allowInvalidContainer: true,
      });
      this.renderer = renderer; // Assign the renderer to the component's state for later use
      this.camera = this.renderer.getCamera(); // Get the camera object from the renderer to allow modification of the zoom

      this.extractUniqueTags();

      this.nodeSearch(); // Call the nodeSearch method to allow searching within the graph and highlighting neighbors on mouseover

      this.dragDrop(); // Call the dragDrop method to enable drag and drop functionality for nodes
    },
  },
};
</script>