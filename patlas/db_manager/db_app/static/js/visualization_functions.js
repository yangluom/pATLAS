/**
* A bunch of global functions to be used throughout patlas
*/

// if this is a developer session please enable the below line of code
const devel = false

// boolean that controls the prerender function if rerun
// is activated
let rerun = false

// helps set menu to close status
let first_click_menu = true

// checks if vivagraph should load first initial dataset or the filters
let firstInstace = true
// variable to check if page was reloaded
let pageReload = false
// variable to check if page was rerun for pffamilies and resistance
// filtering to work properly
let pageReRun = false

// starts a global instance for checking if button was clicked before
let clickedPopupButtonRes = false
let clickedPopupButtonCard = false
let clickedPopupButtonFamily = false

// variable to control stats displayer
let areaSelection = false
// variable to freeze shift
let freezeShift = true

const getArray = (devel === true) ? $.getJSON("/test") : $.getJSON("/fullDS")
// an array to store bootstrap table related list for downloads and coloring
// nodes on submit
let bootstrapTableList = []
// dictionary to store all the connections between species and other taxa
// level available. This needs to be stored here because there is no reason
// to execute the getArray_taxa twice.
const dict_genera = {}
// buttonSubmit current node
let currentQueryNode = false

let masterReadArray = []

let readFilejson = false
let mashJson = false
let assemblyJson = false

let readIndex = -1

let clickedHighchart

let graphSize

/**
 * load JSON file with taxa dictionary
 * @returns {Object} - return is an object that perform matches between taxa
 * levels species, genera, families and orders.
 */
const getArray_taxa = () => {
  return $.getJSON("/taxa")
}

/**
 * load JSON file with resistance dictionary
 * @returns {Object} - returns an object that allows resistance menus to be
 * populated
 */
const getArray_res = () => {
  return $.getJSON("/resistance")
}

/**
 * load JSON file with plasmidfinder dictionary
 * @returns {Object} - returns an object that allows plasmidfinder menus
 * to be populated
 */
const getArray_pf = () => {
  return $.getJSON("/plasmidfinder")
}

// list used to store for re-run button (apply filters)
let listGiFilter = []
let reloadAccessionList = []

// variable to store previous list of accessions that iterate through table
// is the same or not
let previousTableList = []

let sliderMinMax = [] // initiates an array for min and max slider entries
// and stores it for reloading instances of onload()
let list_gi = []
// define render on the scope of onload in order to be used by buttons
// outside renderGraph
let renderer

/**
 * forces welcomeModal to be the first thing the user sees when the page
 * is loaded.
 * @param {function} callback - uses onLoad function as callback in order to
 * allow for welcomeModal to be displayer before rendering everything else with
 * a delay of 1 sec.
 */
const onLoadWelcome = (callback) => {
  // forces welcomeModal to be the first thing the user sees when the page
  // is loaded
  $("#welcomeModal").modal("show")
  //then onLoad is run as a callback
  // for modal to show before page potential page freeze I made it wait half
  // a second before starting the load
  setTimeout( () => {
    callback()
  }, 1000)
}

/**
 * initiates vivagraph main functions
 * onLoad consists of mainly three functions: init, precompute and renderGraph
 * This function is executed after onLoadWelcome function
 */
const onLoad = () => {
  // variable used to control if div is shown or not
  let multiSelectOverlay = false
  // store the node with more links
  let storeMasterNode = []    //cleared every instance of onload
  // start array that controls taxa filters
  const idsArrays = ["p_Order", "p_Family", "p_Genus", "p_Species"]

  let counter = -1 //sets a counter for the loop between the inputs nodes
  // Sets parameters to be passed to WebglCircle in order to change
  // node shape, setting color and size.
  const nodeColor = 0x666370 // hex rrggbb
  const minNodeSize = 4 // a value that assures that the node is
  // displayed without increasing the size of big nodes too much

  let list = []   // list to store references already ploted as nodes
  // links between accession numbers
  let list_lengths = [] // list to store the lengths of all nodes

  // initiate vivagraph instance
  const g = Viva.Graph.graph()
  // define layout
  const layout = Viva.Graph.Layout.forceDirected(g, {
    springLength: 100,
    springCoeff: 0.0001,
    dragCoeff: 0.001, // sets how fast nodes will separate from origin,
    // the higher the value the slower
    gravity: -10,
    theta: 1,
    // This is the main part of this example. We are telling force directed
    // layout, that we want to change length of each physical spring
    // by overriding `springTransform` method:
    springTransform: function (link, spring) {
      spring.length = 100 * Math.log10(1 - link.data.distance) + 100
    }
  })
  // buttons that are able to hide
  let showRerun = document.getElementById("Re_run"),
    showGoback = document.getElementById("go_back"),
    showDownload = document.getElementById("download_ds"),
    showLegend = document.getElementById("colorLegend"),
    showTable = document.getElementById("tableShow"),
    plotButton = document.getElementById("plotButton")


  const graphics = Viva.Graph.View.webglGraphics()

  //* Starts graphics renderer *//
  // TODO without precompute we can easily pass parameters to renderGraph like links distances
  const renderGraph = (graphics) => {
    //const graphics = Viva.Graph.View.webglGraphics()
    //** block #1 for node customization **//
    // first, tell webgl graphics we want to use custom shader
    // to render nodes:
    const circleNode = buildCircleNodeShader()
    graphics.setNodeProgram(circleNode)
    // second, change the node ui model, which can be understood
    // by the custom shader:
    graphics.node( (node) => {
      nodeSize = minNodeSize * node.data.log_length
      return new WebglCircle(nodeSize, nodeColor)
    })

    //* * END block #1 for node customization **//
    // rerun precomputes 500
    // const prerender = (devel === true || rerun === true) ? 500 : 0
    // version that doesn't rerun
    const prerender = (devel === true) ? 500 : parseInt(Math.log(listGiFilter.length)) * 50//prerender depending on the size of the listGiFilter

    renderer = Viva.Graph.View.renderer(g, {
      layout,
      graphics,
      container: document.getElementById("couve-flor"),
      prerender,
      preserveDrawingBuffer: true
    })

    renderer.run()
    // by default the animation on forces is paused since it may be
    // computational intensive for old computers
    renderer.pause()
    //* * Loading Screen goes off **//
    $("#loading").hide()
    $("#couve-flor").css("visibility", "visible")

    /*******************/
    /* MULTI-SELECTION */
    /*******************/

    $("#refreshButton").unbind("click").bind("click", () => {
      if (freezeShift === false) {
        freezeShift = true
        multiSelectOverlayObj.destroy()
        $("#refreshButton").removeClass("btn-success").addClass("btn-default")
      } else {
        freezeShift = false
        $("#refreshButton").removeClass("btn-default").addClass("btn-success")
      }
    })

    // event for shift key down
    // shows overlay div and exectures startMultiSelect
    document.addEventListener("keydown", (e) => {
      if (e.which === 16 && multiSelectOverlay === false && freezeShift === false) { // shift key
        // should close popup open so it doesn't get into listGiFilter
        $("#closePop").click()
        $(".graph-overlay").show()
        multiSelectOverlay = true
        multiSelectOverlayObj = startMultiSelect(g, renderer, layout)
        showRerun.style.display = "block"
        showGoback.style.display = "block"
        showDownload.style.display = "block"
        showTable.style.display = "block"
        plotButton.style.display = "block"
        // showGoback.className = showGoback.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
        // showDownload.className = showDownload.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
        // showTable.className = showTable.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
        areaSelection = true
        listGiFilter = [] //if selection is made listGiFilter should be empty
        resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      }
    })
    // event for shift key up
    // destroys overlay div and transformes multiSelectOverlay to false
    document.addEventListener("keyup", (e) => {
      if (e.which === 16 && multiSelectOverlay !== "disable") {
        $(".graph-overlay").hide()
        $("#colorLegend").hide()
        if (multiSelectOverlay !== false) {
          multiSelectOverlayObj.destroy()
        }
        multiSelectOverlay = false
      }
    })

    defaultZooming(layout, renderer)

    // used to center on the node with more links
    // this is used to skip if it is a re-run button execution
    if (storeMasterNode.length > 0) {
      recenterDOM(renderer, layout, storeMasterNode)
    }

    //* ************//
    //* **ZOOMING***//
    //* ************//

    // opens events in webgl such as mouse hoverings or clicks

    $("#zoom_in").unbind("click").bind("click", (event) => {
      event.preventDefault()
      renderer.zoomIn()
      renderer.rerender()   // rerender after zoom avoids glitch with
      // duplicated nodes
    })
    $("#zoom_out").unbind("click").bind("click", (event) => {
      event.preventDefault()
      renderer.zoomOut()
      renderer.rerender()   // rerender after zoom avoids glitch with
      // duplicated nodes
    })

    //* *************//
    //* ** TOGGLE ***//
    //* *************//
    //* * This section controls the connection between the toggle button on the leftside ***//
    //* * and the dropdown on the right side **//

    toggle_status = false // default state
    $("#toggle-event").bootstrapToggle("off") // set to default off
    $("#toggle-event").change(function () {   // jquery seems not to support es6
      toggle_status = $(this).prop("checked")
      toggle_manager(toggle_status)
    })

    //* *************//
    //* ** EVENTS ***//
    //* *************//

    const events = Viva.Graph.webglInputEvents(graphics, g)
    store_nodes = []  // list used to store nodes

    //* * mouse click on nodes **//
    events.click( (node, e) => {
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      // this resets previous selected node to previous color
      if (currentQueryNode) {
        graphics.getNodeUI(currentQueryNode).color = graphics.getNodeUI(currentQueryNode).backupColor
      }
      // then starts making new changes to the newly geerated node
      currentQueryNode = node.id
      nodeUI_1 = graphics.getNodeUI(node.id)
      const domPos = {
        x: nodeUI_1.position.x,
        y: nodeUI_1.position.y
      }
      // if statement used to check if backup color is set
      if (nodeUI_1.backupColor) { nodeUI_1.backupColor = nodeUI_1.color }

      nodeUI_1.color = 0xFFC300
      renderer.rerender()

      // allows the control of the click appearing and locking

      // And ask graphics to transform it to DOM coordinates:
      graphics.transformGraphToClientCoordinates(domPos)
      domPos.x = (domPos.x + nodeUI_1.size) + "px"
      domPos.y = (domPos.y) + "px"

      // this sets the popup internal buttons to allow them to run,
      // otherwise they won't run because its own function returns this
      // variable to false, preveting the popup to expand with its
      // respectiv functions
      clickedPopupButtonCard = true
      clickedPopupButtonRes = true
      clickedPopupButtonFamily = true
      // requests table for sequences metadata
      requestPlasmidTable(node, setupPopupDisplay)
    })

    //* **************//
    //* ** BUTTONS ***//
    //* **************//
    // $("#closePop").on('click', () => {
    $("#closePop").unbind("click").bind("click", () => { //TODO ISSUE
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      $("#popup_description").hide()

      if (currentQueryNode !== false) {
        graphics.getNodeUI(currentQueryNode).color = graphics.getNodeUI(currentQueryNode).backupColor
      } //else {
        //graphics.getNodeUI(currentQueryNode).color = 0x666370
      //}
      currentQueryNode = false
      renderer.rerender()
    })

    //**** BUTTONS THAT CONTROL PLOTS ****//

    let clickerButton, listPlots

    // Button to open modal for plots
    // all these buttons require that the modalPlot modal opens before
    // executing the function and that is the reason why they wait half a
    // second before executing repetitivePlotFunction's
    $("#plotButton").unbind("click").bind("click", () => {
      $("#modalPlot").modal()
      clickerButton = "species"
      listGiFilter = (reloadAccessionList.length !== 0) ?
        // reduces listGiFilter to reloadAccessionList
        listGiFilter.filter( (n) => reloadAccessionList.includes(n)) :
        // otherwise maintain listGiFilter untouched
        listGiFilter
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#speciesStats").unbind("click").bind("click", () => {
      clickerButton = "species"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      },500)
    })

    $("#genusStats").unbind("click").bind("click", () => {
      clickerButton = "genus"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#familyStats").unbind("click").bind("click", () => {
      clickerButton = "family"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#orderStats").unbind("click").bind("click", () => {
      clickerButton = "order"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#resistanceStats").unbind("click").bind("click", () => {
      clickerButton = "resistances"
      setTimeout( () => {
        listPlots = resRepetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#pfamilyStats").unbind("click").bind("click", () => {
      clickerButton = "plasmid families"
      setTimeout( () => {
        listPlots = pfRepetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    // redundant with speciesStats but may be useful in the future
    $("#lengthStats").unbind("click").bind("click", () => {
      clickerButton = "length"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    $("#clusterStats").unbind("click").bind("click", () => {
      clickerButton = "cluster"
      setTimeout( () => {
        listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
      }, 500)
    })

    // sort by values
    $("#sortGraph").unbind("click").bind("click", () => {
      const sortVal = true
      const layoutPlot = layoutGet(clickerButton, [...new Set(listPlots)].length)
      if (listPlots) { statsParser(false, listPlots, layoutPlot, clickerButton, false, sortVal) }
    })

    // sort alphabetically
    $("#sortGraphAlp").unbind("click").bind("click", () => {
      const sortAlp = true
      const layoutPlot = layoutGet(clickerButton, [...new Set(listPlots)].length)
      if (listPlots) { statsParser(false, listPlots, layoutPlot, clickerButton, sortAlp, false) }
    })

    // BUTTONS INSIDE PLOT MODAL THAT ALLOW TO SWITCH B/W PLOTS //

    // if buttons inside modalPlot are pressed

    $("#lengthPlot").unbind("click").bind("click", () => {
      clickerButton = "length"
      // TODO save previous plotly generated graphs before rendering the new ones
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#speciesPlot").unbind("click").bind("click", () => {
      clickerButton = "species"
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#genusPlot").unbind("click").bind("click", () => {
      clickerButton = "genus"
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#familyPlot").unbind("click").bind("click", () => {
      clickerButton = "family"
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#orderPlot").unbind("click").bind("click", () => {
      clickerButton = "order"
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#clusterPlot").unbind("click").bind("click", () => {
      clickerButton = "cluster"
      listPlots = repetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#resPlot").unbind("click").bind("click", () => {
      clickerButton = "resistances"
      listPlots = resRepetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    $("#pfPlot").unbind("click").bind("click", () => {
      clickerButton = "plasmid families"
      listPlots = pfRepetitivePlotFunction(areaSelection, listGiFilter, clickerButton, g, graphics)
    })

    //**** BUTTONS THAT CONTROL VIVAGRAPH DISPLAY ****//

    // Buttons to control force play/pause using bootstrap navigation bar
    paused = true
    $("#playpauseButton").unbind("click").bind("click", () => {
      $("#playpauseButton").empty()
      if (paused === true) {
        renderer.resume()
        $("#playpauseButton").append("<span class='glyphicon glyphicon-pause'></span>")
        $("#playpauseButton").removeClass("btn-default").addClass("btn-success")
        paused = false
      } else {
        renderer.pause()
        $("#playpauseButton").append("<span class='glyphicon glyphicon-play'></span>")
        $("#playpauseButton").removeClass("btn-success").addClass("btn-default")
        paused = true
      }
    })

    // Form and button for search box
    $("#submitButton").unbind("click").bind("click", (event) => {
      $("#resTab").removeClass("active")
      $("#resButton").removeClass("active")
      $("#pfTab").removeClass("active")
      $("#plasmidButton").removeClass("active")
      event.preventDefault()    // prevents page from reloading
      if (toggle_status === false) {
        // const query !==)
        const query = ($("#formValueId").val() === "") ? clickedHighchart :
          $("#formValueId").val().replace(".", "_")

        currentQueryNode = centerToggleQuery(g, graphics, renderer, query,
          currentQueryNode, clickedPopupButtonCard, clickedPopupButtonRes,
          clickedPopupButtonFamily, requestPlasmidTable)
      } else {
        // executed for plasmid search
        toggleOnSearch(g, graphics, renderer,
          currentQueryNode, clickedPopupButtonCard, clickedPopupButtonRes,
          clickedPopupButtonFamily)
          // then is here used to parse the results from async/await function
          .then( (result) => {
            currentQueryNode = result
          })
      }
      // this sets the popup internal buttons to allow them to run,
      // otherwise they won't run because its own function returns this
      // variable to false, preventing the popup to expand with its
      // respective functions
      clickedPopupButtonCard = true
      clickedPopupButtonRes = true
      clickedPopupButtonFamily = true
    })
    // Button to clear the selected nodes by form
    $("#clearButton").unbind("click").bind("click", () => {
      document.getElementById("formValueId").value = ""
    })

    //* ******************//
    //* ***plasmidfinder Filters****//
    //* ******************//

    if (firstInstace === true && pageReload === false) {
      getArray_pf().done((json) => {
        // first parse the json input file
        const listPF = []
        // iterate over the file
        $.each(json, (accession, entry) => {
          geneEntries = entry.gene
          for (let i in geneEntries) {
            if (listPF.indexOf(geneEntries[i]) < 0) {
              listPF.push(geneEntries[i])
            }
          }
        })
        // populate the menus
        singleDropdownPopulate("#plasmidFamiliesList", listPF, "PlasmidfinderClass")

        $(".PlasmidfinderClass").on("click", function (e) {
          // fill panel group displaying current selected taxa filters //
          const stringClass = this.className.slice(0, -5)
          const tempVar = this.firstChild.innerHTML
          // checks if a taxon is already in display
          const divStringClass = "#p_" + stringClass

          filterDisplayer(tempVar, stringClass, divStringClass)
        })
      })
    }

    // setup clear button for plasmidfinder functions
    $("#pfClear").unbind("click").bind("click", (event) => {
      document.getElementById("reset-sliders").click()
      // clear = true;
      event.preventDefault()
      // this needs an array for reusability purposes
      resetDisplayTaxaBox(["p_Plasmidfinder"])

      // resets dropdown selections
      $("#plasmidFamiliesList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      node_color_reset(graphics, g, nodeColor, renderer)
      if (typeof showLegend !== "undefined" && $("#scaleLegend").html() === "") {
        showLegend.style.display = "none"
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      }
    })

    $("#pfSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      // clears previous selected nodes
      node_color_reset(graphics, g, nodeColor, renderer)
      // empties taxa and plasmidfinder legend
      $("#taxa_label").hide()
      $("#colorLegendBox").empty()
      $("#res_label").hide()
      $("#colorLegendBoxRes").empty()
      // reset nodes before submitting new colors
      const tempPageReRun = pageReRun
      pfSubmitFunction(g, graphics, renderer, tempPageReRun).then( (results) =>  {
        legendInst = results
        pageReRun = false
        // just show legend if any selection is made at all
        if (legendInst === true) {
          showLegend.style.display = "block"
          showRerun.style.display = "block"
          showGoback.style.display = "block"
          showDownload.style.display = "block"
          showTable.style.display = "block"
          plotButton.style.display = "block"
          // showGoback.className = showGoback.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
          // showDownload.className = showDownload.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
          // showTable.className = showTable.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
        }
      })
    })

    //* ******************//
    //* ***Resistance Filters****//
    //* ******************//

    // first parse the json input file
    if (firstInstace === true && pageReload === false) {
      getArray_res().done((json) => {
        const listCard = [],
          listRes = []
        // iterate over the file
        $.each(json, (accession, entry) => {
          databaseEntries = entry.database
          geneEntries = entry.gene
          for (let i in databaseEntries) {
            if (databaseEntries[i] === "card" && listCard.indexOf(geneEntries[i]) < 0) {
              listCard.push(geneEntries[i])
            } else {
              if (listRes.indexOf(geneEntries[i]) < 0) {
                listRes.push(geneEntries[i])
              }
            }
          }
        })
        // populate the menus
        singleDropdownPopulate("#cardList", listCard, "CardClass")
        singleDropdownPopulate("#resList", listRes, "ResfinderClass")

        const classArray = [".CardClass", ".ResfinderClass"]
        for (let i = 0; i < classArray.length; i++) {
          $(classArray[i]).on("click", function (e) {
            // fill panel group displaying current selected taxa filters //
            const stringClass = this.className.slice(0, -5)
            const tempVar = this.firstChild.innerHTML

            // checks if a taxon is already in display
            const divStringClass = "#p_" + stringClass

            filterDisplayer(tempVar, stringClass, divStringClass)
          })
        }
      })
    }

    $("#resClear").unbind("click").bind("click", (event) => {
      event.preventDefault()
      document.getElementById("reset-sliders").click()
      resetDisplayTaxaBox(["p_Resfinder", "p_Card"])

      // resets dropdown selections
      $("#cardList").selectpicker("deselectAll")
      $("#resList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      node_color_reset(graphics, g, nodeColor, renderer)
      if (typeof showLegend !== "undefined" && $("#scaleLegend").html() === "") {
        showLegend.style.display = "none"
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      }
    })
    $("#resSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      // clears previously selected nodes
      node_color_reset(graphics, g, nodeColor, renderer)
      // empties taxa and plasmidfinder legend
      $("#taxa_label").hide()
      $("#colorLegendBox").empty()
      $("#pf_label").hide()
      $("#colorLegendBoxPf").empty()
      // same should be done for taxa filters submit button
      const tempPageReRun = pageReRun
      resSubmitFunction(g, graphics, renderer, tempPageReRun).then( (results) => {
        legendInst = results
        pageReRun = false
        // just show legend if any selection is made at all
        if (legendInst === true) {
          showLegend.style.display = "block"
          showRerun.style.display = "block"
          showGoback.style.display = "block"
          showDownload.style.display = "block"
          showTable.style.display = "block"
          plotButton.style.display = "block"
          // showGoback.className = showGoback.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
          // showDownload.className = showDownload.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
          // showTable.className = showTable.className.replace(/(?:^|\s)disabled(?!\S)/g, "")
        }
      })
    })


    //* ******************//
    //* ***Taxa Filter****//
    //* ******************//

    const list_orders = [],
      list_families = [],
      list_genera = [],
      list_species = []
    if (firstInstace === true && pageReload === false) {
      getArray_taxa().done((json) => {
        $.each(json, (sps, other) => {    // sps aka species
          const species = sps.split("_").join(" ")
          const genus = other[0]
          const family = other[1]
          const order = other[2]
          dict_genera[species] = [genus, family, order] // append the list to
          // this dict to be used later
          if (list_genera.indexOf(genus) < 0) {
            list_genera.push(genus)
          }
          if (list_families.indexOf(family) < 0) {
            list_families.push(family)
          }
          if (list_orders.indexOf(order) < 0) {
            list_orders.push(order)
          }
          if (list_species.indexOf(species) < 0) {
            list_species.push(species)
          }
        })

        // populate the menus
        singleDropdownPopulate("#orderList", list_orders, "OrderClass")
        singleDropdownPopulate("#familyList", list_families, "FamilyClass")
        singleDropdownPopulate("#genusList", list_genera, "GenusClass")
        singleDropdownPopulate("#speciesList", list_species, "SpeciesClass")

        // clickable <li> and control of displayer of current filters
        const classArray = [".OrderClass", ".FamilyClass", ".GenusClass", ".SpeciesClass"]
        for (let i = 0; i < classArray.length; i++) {
          $(classArray[i]).on("click", function (e) {
            // fill panel group displaying current selected taxa filters //
            const stringClass = this.className.slice(0, -5)
            const tempVar = this.firstChild.innerHTML

            // checks if a taxon is already in display
            const divStringClass = "#p_" + stringClass

            filterDisplayer(tempVar, stringClass, divStringClass)
          })
        }
      })
    }

    //* **** Clear selection button *****//
    // clear = false; //added to control the colors being triggered after clearing
    $("#taxaModalClear").unbind("click").bind("click", (event) => {
      document.getElementById("reset-sliders").click()
      // clear = true;
      event.preventDefault()
      resetDisplayTaxaBox(idsArrays)

      // resets dropdown selections
      $("#orderList").selectpicker("deselectAll")
      $("#familyList").selectpicker("deselectAll")
      $("#genusList").selectpicker("deselectAll")
      $("#speciesList").selectpicker("deselectAll")

      slider.noUiSlider.set([min, max])
      node_color_reset(graphics, g, nodeColor, renderer)
      if (typeof showLegend !== "undefined" && $("#scaleLegend").html() === "") {
        showLegend.style.display = "none"
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        //document.getElementById("go_back").className += " disabled"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      } else {
        $("#colorLegendBox").empty()
        document.getElementById("taxa_label").style.display = "none" // hide label
        showRerun.style.display = "none"
        showGoback.style.display = "none"
        //document.getElementById("go_back").className += " disabled"
        showDownload.style.display = "none"
        showTable.style.display = "none"
        plotButton.style.display = "none"
      }
    })

    //* **** Submit button for taxa filter *****//

    // perform actions when submit button is clicked.

    $("#taxaModalSubmit").unbind("click").bind("click", (event) => {
      // clear legend from reads
      $("#readString").empty()
      $("#readLegend").empty()
      $("#read_label").hide()
      event.preventDefault()
      // changed nodes is reset every instance of taxaModalSubmit button
      listGiFilter = []   // makes listGiFilter an empty array
      // noLegend = false // sets legend to hidden state by default
      // now processes the current selection
      const species_query = document.getElementById("p_Species").innerHTML,
        genus_query = document.getElementById("p_Genus").innerHTML,
        family_query = document.getElementById("p_Family").innerHTML,
        order_query = document.getElementById("p_Order").innerHTML
      let selectedSpecies = species_query.replace("Species:", "").split(",").filter(Boolean),
        selectedGenus = genus_query.replace("Genus:", "").split(",").filter(Boolean),
        selectedFamily = family_query.replace("Family:", "").split(",").filter(Boolean),
        selectedOrder = order_query.replace("Order:", "").split(",").filter(Boolean)
      // remove first char from selected* arrays
      selectedSpecies = removeFirstCharFromArray(selectedSpecies)
      selectedGenus = removeFirstCharFromArray(selectedGenus)
      selectedFamily = removeFirstCharFromArray(selectedFamily)
      selectedOrder = removeFirstCharFromArray(selectedOrder)

      //* *** Alert for taxa filter ****//
      // print alert if no filters are selected
      let counter = 0 // counts the number of taxa type that has not been
      // selected

      const alertArrays = {
        "order": selectedOrder,
        "family": selectedFamily,
        "genus": selectedGenus,
        "species": selectedSpecies
      }

      const divAlert = document.getElementById("alertId")
      let Alert = false
      for (const i in alertArrays) {
        // if (alertArrays[i].length === 0) {
        //   Alert = true
        //   counter = 4  // counter used to check if more than one dropdown has selected options
        if (alertArrays[i].length > 0) {
          counter = counter + 1
          Alert = false
        } else if (alertArrays.order.length === 0 &&
          alertArrays.family.length === 0 &&
            alertArrays.genus.length === 0 &&
            alertArrays.species.length === 0) {
          Alert = true
        }

      }
      if (Alert === true) {
        divAlert.style.display = "block"
        showLegend.style.display = "none" // removes legend when this
        // warning is raised
        Alert = false
      }

      // auto hide after 5 seconds without closing the div
      window.setTimeout( () => { $("#alertId").hide() }, 5000)

      //* *** End Alert for taxa filter ****//

      // make tmpselectedGenus an associative array since it is the base of family and order arrays

      let assocFamilyGenus = {}
      let assocOrderGenus = {}
      let assocGenus = {}

      // appends genus to selectedGenus according with the family and order for single-color selection
      // also appends to associative arrays for family and order for multi-color selection
      $.each(dict_genera, (species, pair) => {
        const genus = pair[0]
        const family = pair[1]
        const order = pair[2]
        if (selectedFamily.indexOf(family) >= 0) {
          selectedGenus.push(species)
          if (!(family in assocFamilyGenus)) {
            assocFamilyGenus[family] = []
            assocFamilyGenus[family].push(species)
          } else {
            assocFamilyGenus[family].push(species)
          }
        } else if (selectedOrder.indexOf(order) >= 0) {
          selectedGenus.push(species)
          if (!(order in assocOrderGenus)) {
            assocOrderGenus[order] = []
            assocOrderGenus[order].push(species)
          } else {
            assocOrderGenus[order].push(species)
          }
        } else if (selectedGenus.indexOf(genus) >= 0) {
          if (!(genus in assocGenus)) {
            assocGenus[genus] = []
            assocGenus[genus].push(species)
          } else {
            assocGenus[genus].push(species)
          }
        }
      })

      // renders the graph for the desired taxon if more than one taxon type is selected
      let store_lis = "" // a variable to store all <li> generated for legend
      let firstIteration = true // boolean to control the upper taxa level
      // (order or family)

      // first restores all nodes to default color
      node_color_reset(graphics, g, nodeColor, renderer)
      // empties taxa and plasmidfinder legend
      $("#res_label").hide()
      $("#colorLegendBoxRes").empty()
      $("#pf_label").hide()
      $("#colorLegendBoxPf").empty()

      // if multiple selections are made in different taxa levels
      if (counter > 1 && counter <= 4) {
        const style_color = "background-color:" + colorList[2]
        store_lis = store_lis + "<li" +
          " class='centeredList'><button class='jscolor btn" +
          " btn-default' style=" + style_color + "></button>&nbsp;multi taxa" +
          " selection</li>"
        showDiv().then( () => {
          const promises = []
          const currentColor = 0xf71735   // sets color of all changes_nodes to
          // be red
          store_lis = "<li class='centeredList'><button class='jscolor btn'" +
            " btn-default' style='background-color:#f71735'></button>&nbsp;multi-level selected taxa</li>"
          // for (const i in alertArrays.order) {
          let currentSelectionOrder = alertArrays.order
          for (const i in currentSelectionOrder) {
            const tempArray = assocOrderGenus[currentSelectionOrder[i]]
            for (const sp in tempArray) {
              promises.push(
                taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                  .then( (results) => {
                    results.map( (request) => {
                      listGiFilter.push(request.plasmid_id)
                    })
                  })
              )
            }
          }
          // }
          // for (i in alertArrays.family) {
          let currentSelectionFamily = alertArrays.family
          for (const i in currentSelectionFamily) {
            const tempArray = assocFamilyGenus[currentSelectionFamily[i]]
            for (const sp in tempArray) {
              promises.push(
                taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                  .then( (results) => {
                    results.map( (request) => {
                      listGiFilter.push(request.plasmid_id)
                    })
                  })
              )
            }
          }
          // }
          // for (i in alertArrays.genus) {
          let currentSelectionGenus = alertArrays.genus
          for (const i in currentSelectionGenus) {
            const tempArray = assocGenus[currentSelectionGenus[i]]
            for (const sp in tempArray) {
              promises.push(
                taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                  .then( (results) => {
                    results.map( (request) => {
                      listGiFilter.push(request.plasmid_id)
                    })
                  })
              )
            }
          }
          // }
          // for (i in alertArrays.species) {
          let currentSelectionSpecies = alertArrays.species
          for (const i in currentSelectionSpecies) {
            promises.push(
              taxaRequest(g, graphics, renderer, currentSelectionSpecies[i], currentColor, reloadAccessionList)//, changed_nodes)
                .then( (results) => {
                  results.map( (request) => {
                    listGiFilter.push(request.plasmid_id)
                  })
                })
            )
            // }
          }
          Promise.all(promises)
            .then( () => {
              $("#loading").hide()
              showLegend.style.display = "block"
              document.getElementById("taxa_label").style.display = "block" // show label
              $("#colorLegendBox").empty()
              $("#colorLegendBox").append(store_lis +
                '<li class="centeredList"><button class="jscolor btn btn-default" style="background-color:#666370" ></button>&nbsp;unselected</li>')
              showRerun.style.display = "block"
              showGoback.style.display = "block"
              showDownload.style.display = "block"
              showTable.style.display = "block"
              plotButton.style.display = "block"
            })
        })
      }
      // renders the graph for the desired taxon if one taxon type is selected
      // allows for different colors between taxa of the same level
      else if (counter === 1) {
        let currentSelection
        // first cycle between all the arrays to find which one is not empty
        for (const array in alertArrays) {
          // selects the not empty array
          if (alertArrays[array].length !== 0 && firstIteration === true) {
            currentSelection = alertArrays[array]
            // performs the actual interaction for color picking and assigning
            showDiv().then( () => {
              const promises = []
              for (const i in currentSelection) {
                // orders //
                if (alertArrays.order.length !== 0) {
                  const currentColor = colorList[i].replace("#", "0x")
                  const tempArray = assocOrderGenus[currentSelection[i]]
                  const style_color = 'background-color:' + colorList[i]
                  store_lis = store_lis + '<li' +
                    ' class="centeredList"><button class="jscolor btn' +
                    ' btn-default" style=' + style_color + '></button>&nbsp;' + currentSelection[i] + '</li>'
                  // executres node function for family and orders
                  for (const sp in tempArray) {
                    promises.push(
                      taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                        .then((results) => {
                          results.map((request) => {
                            listGiFilter.push(request.plasmid_id)
                          })
                        })
                    )
                  }
                }

                // families //
                else if (alertArrays.family.length !== 0) {
                  const currentColor = colorList[i].replace("#", "0x")
                  const tempArray = assocFamilyGenus[currentSelection[i]]
                  const style_color = "background-color:" + colorList[i]
                  store_lis = store_lis + '<li' +
                    ' class="centeredList"><button class="jscolor btn' +
                    ' btn-default" style=' + style_color + '></button>&nbsp;' + currentSelection[i] + '</li>'
                  // executres node function for family
                  for (const sp in tempArray) {
                    promises.push(
                      taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                        .then((results) => {
                          results.map((request) => {
                            listGiFilter.push(request.plasmid_id)
                          })
                        })
                    )
                  }
                }

                // genus //
                else if (alertArrays.genus.length !== 0) {
                  const currentColor = colorList[i].replace("#", "0x")
                  const tempArray = assocGenus[currentSelection[i]]
                  const style_color = "background-color:" + colorList[i]
                  store_lis = store_lis + '<li class="centeredList"><button class="jscolor btn btn-default" style=' +
                    style_color + '></button>&nbsp;' + currentSelection[i] + '</li>'

                  // requests taxa associated accession from db and colors
                  // respective nodes
                  for (const sp in tempArray) {
                    promises.push(
                      taxaRequest(g, graphics, renderer, tempArray[sp], currentColor, reloadAccessionList)//, changed_nodes)
                        .then((results) => {
                          results.map((request) => {
                            listGiFilter.push(request.plasmid_id)
                          })
                        })
                    )
                  }
                }

                // species //
                else if (alertArrays.species.length !== 0) {
                  const currentColor = colorList[i].replace("#", "0x")
                  const style_color = "background-color:" + colorList[i]
                  store_lis = store_lis + '<li class="centeredList"><button class="jscolor btn btn-default" style=' +
                    style_color + '></button>&nbsp;' + currentSelection[i] + '</li>'

                  // requests taxa associated accession from db and colors
                  // respective nodes
                  promises.push(
                    taxaRequest(g, graphics, renderer, currentSelection[i], currentColor, reloadAccessionList)
                    // })//, changed_nodes)
                      .then((results) => {
                        results.map(request => {
                          listGiFilter.push(request.plasmid_id)
                        })
                      })
                  )
                }
              }
              Promise.all(promises)
                .then(() => {
                  $("#loading").hide()
                  showLegend.style.display = "block"
                  document.getElementById("taxa_label").style.display = "block" // show label
                  $("#colorLegendBox").empty()
                  $("#colorLegendBox").append(store_lis +
                    '<li class="centeredList"><button class="jscolor btn btn-default" style="background-color:#666370" ></button>&nbsp;unselected</li>')
                  showRerun.style.display = "block"
                  showGoback.style.display = "block"
                  showDownload.style.display = "block"
                  showTable.style.display = "block"
                  plotButton.style.display = "block"
                })
            }) // ends showDiv

            firstIteration = false // stops getting lower levels
          }
        }
      }
      // used to control if no selection was made avoiding to display the legend
      // else {
      //   noLegend = true
      // }
      // // show legend //
      // if (noLegend === false) {
      //   showLegend.style.display = "block"
      //   document.getElementById("taxa_label").style.display = "block" // show label
      //   $("#colorLegendBox").empty()
      //   $("#colorLegendBox").append(store_lis +
      //     '<li class="centeredList"><button class="jscolor btn btn-default" style="background-color:#666370" ></button>&nbsp;unselected</li>')
      //   showRerun.style.display = "block"
      //   showGoback.style.display = "block"
      //   showDownload.style.display = "block"
      //   showTable.style.display = "block"
      // }
    })

    //* ************//
    //* ***READS****//
    //* ************//
    const pushToMasterReadArray = (readFilejson) => {
      const returnArray = []
      // iterate for all files and save to masterReadArray to use in heatmap
      for (const i in readFilejson) {
        if (readFilejson.hasOwnProperty(i)) {
          const fileEntries = JSON.parse(readFilejson[i])
          // iterate each accession number
          for (const i2 in fileEntries) {
            if (fileEntries.hasOwnProperty(i2)) {
              // if not in masterReadArray then add it
              const percValue = (typeof(fileEntries[i2]) === "number") ?
                fileEntries[i2] : parseFloat(fileEntries[i2][0])
              if (returnArray.indexOf(i2) < 0 && percValue >= cutoffParser()) {
                returnArray.push(i2)
              }
            }
          }
        }
      }
      return returnArray
    }

    $("#fileSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      masterReadArray = []
      // feeds the first file
      const readString = JSON.parse(Object.values(readFilejson)[0])
      $("#fileNameDiv").html(Object.keys(readFilejson)[0])
      $("#fileNameDiv").show()
      // readIndex will be used by slider buttons
      readIndex += 1
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      $("#loading").show()
      setTimeout( () => {
        // colors each node for first element of readFilejson
        const outLists = readColoring(g, list_gi, graphics, renderer, readString)
        list_gi  = outLists[0]
        listGiFilter = outLists[1]
        masterReadArray = pushToMasterReadArray(readFilejson)
      }, 100)

      // }
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
      $("#slideRight").prop("disabled", false)
      $("#slideLeft").prop("disabled", false)
    })

    $("#cancel_infile").unbind("click").bind("click", () => {
      abortRead(readFilejson)
    })

    //* ************//
    //* ***MASH****//
    //* ************//

    $("#fileSubmit_mash").unbind("click").bind("click", (event) => {
      masterReadArray = []
      readFilejson = mashJson // converts mash_json into readFilejson to
      readString = JSON.parse(Object.values(readFilejson)[0])
      $("#fileNameDiv").html(Object.keys(readFilejson)[0])
      $("#fileNameDiv").show()
      // readIndex will be used by slider buttons
      readIndex += 1
      // it and use the same function (readColoring)
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      event.preventDefault()
      $("#loading").show()
      setTimeout( () => {
        // TODO this readFilejson here must be a json object from 1 file
        const outputList = readColoring(g, list_gi, graphics, renderer, readString)
        list_gi = outputList[0]
        listGiFilter = outputList[1]
        masterReadArray = pushToMasterReadArray(readFilejson)
      }, 100)

      // }
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
      $("#slideRight").prop("disabled", false)
      $("#slideLeft").prop("disabled", false)

    })

    $("#cancel_infile_mash").unbind("click").bind("click", () => {
      abortRead(mashJson)
    })

    //* ********* ***//
    //* * Assembly **//
    //* ********* ***//
    $("#assemblySubmit").unbind("click").bind("click", (event) => {
      masterReadArray = []
      event.preventDefault()
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
      $("#loading").show()
      // setTimeout( () => {
      listGiFilter = assembly(list_gi, assemblyJson, g, graphics, masterReadArray, listGiFilter)
      // }, 100)
      setTimeout( () => {
        renderer.rerender()
        // TODO raise a warning for users to press play if they want
      }, 100)

      // }
      // used to hide when function is not executed properly
      setTimeout( () => {
        $("#loading").hide()
      }, 100)
    })

    $("#cancel_assembly").unbind("click").bind("click", () => {
      abortRead(assemblyJson)
    })

    //* *********************//
    //* * Distances filter **//
    //* *********************//
    $("#distancesSubmit").unbind("click").bind("click", (event) => {
      event.preventDefault()
      $("#loading").show()
      $("#scaleLegend").empty()
      setTimeout(function () {
        link_coloring(g, graphics, renderer)
      }, 100)
      const readMode = false
      color_legend(readMode)
      //document.getElementById("reset-links").disabled = ""
    })

    $("#reset-links").unbind("click").bind("click", (event) => {
      event.preventDefault()
      const arrayOfDivs = [
        $("#colorLegendBox").html(),
        $("#colorLegendBoxRes").html(),
        $("#colorLegendBoxPf").html(),
        $("#readLegend").html(),
        $("#assemblyLegend").html(),

      ]
      let divCounter = 0
      for (const div of arrayOfDivs) {
        if (div === "") {
          divCounter += 1
          if (divCounter === 5) {
            // $("#scaleLegend").empty()
            // $("#scaleString").empty()
            // $("#distance_label").hide()
            showLegend.style.display = "none"

            //document.getElementById("reset-links").disabled = "disabled"
          }
        }
      }
      $("#scaleLegend").empty()
      $("#scaleString").empty()
      $("#distance_label").hide()
      setTimeout(function () {
        reset_link_color(g, graphics, renderer)
      }, 100)
    })

    //* ********************//
    //* ***Length filter****//
    //* ********************//

    //* * slider button and other options **//

    // sets the limits of buttons and slider
    // this is only triggered on first instance because we only want to get
    // the limits of all plasmids once
    if (sliderMinMax.length === 0) {
      sliderMinMax = [Math.log(Math.min.apply(null, list_lengths)),
        Math.log(Math.max.apply(null, list_lengths))]
      // generates and costumizes slider itself
      const slider = document.getElementById("slider")

      noUiSlider.create(slider, {
        start: sliderMinMax,  //this is an array
        behaviour: "snap",   // snaps the closest slider
        connect: true,
        range: {
          "min": sliderMinMax[0],
          "max": sliderMinMax[1]
        }
      })
    }

    // event handler for slider
    // trigger only if clicked to avoid looping through the nodes again
    $("#length_filter").unbind("click").bind("click", () => {
      slider.noUiSlider.on("set", (event) => {
        let slider_max = Math.exp(slider.noUiSlider.get()[1]),
          slider_min = Math.exp(slider.noUiSlider.get()[0])
        g.forEachNode( (node) => {
          // check if node is not a singleton
          // singletons for now do not have size set so they cannot be
          // filtered with this method
          // only changes nodes for nodes with seq_length data
          if (node.data.seq_length) {
            const node_length = node.data.seq_length.split(">").slice(-1).toString()
            let nodeUI = graphics.getNodeUI(node.id)
            if (parseInt(node_length) < parseInt(slider_min) || parseInt(node_length) > parseInt(slider_max)) {
              nodeUI.color = 0xcdc8b1 // shades nodes
            } else if (parseInt(node_length) >= parseInt(slider_min) || parseInt(node_length) <= parseInt(slider_max)) {
              nodeUI.color = nodeUI.backupColor // return nodes to original color
            }
          }
        })
        renderer.rerender()
      })
    })

    // inputs mins and maxs for slider
    const inputMin = document.getElementById("slider_input_min"),
      inputMax = document.getElementById("slider_input_max"),
      inputs = [inputMin, inputMax]
    slider.noUiSlider.on("update", function (values, handle) {
      inputs[handle].value = Math.trunc(Math.exp(values[handle]))
    })

    // resets the slider
    $("#reset-sliders").unbind("click").bind("click", () => {
      listGiFilter = [] //resets listGiFilter
      areaSelection = false
      readFilejson = false // makes file selection empty again
      assemblyJson = false
      mashJson = false
      currentQueryNode = false
      slider.noUiSlider.set(sliderMinMax)
      resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
    })
    // runs the re run operation for the selected species
    $("#Re_run").unbind("click").bind("click", () => {
      // resets areaSelection
      areaSelection = false
      firstInstace = false
      rerun = true
      reloadAccessionList = []  // needs to be killed every instance in
      // order for reload to allow reloading again
      //* * Loading Screen goes on **//
      // removes disabled from class in go_back button
      // document.getElementById("go_back").className = document.getElementById("go_back").className.replace(/(?:^|\s)disabled(?!\S)/g, "")
      // document.getElementById("download_ds").className = document.getElementById("download_ds").className.replace(/(?:^|\s)disabled(?!\S)/g, "")
      // document.getElementById("tableShow").className = document.getElementById("tableShow").className.replace(/(?:^|\s)disabled(?!\S)/g, "")
      showDiv().then( () => {
        // removes nodes
        setTimeout( () => {
          actualRemoval(g, graphics, onLoad, false)
          freezeShift = true
        }, 100)
      })
    })

    // returns to the initial tree by reloading the page
    $("#go_back").unbind("click").bind("click", () => {
      // window.location.reload()   // a temporary fix to go back to full dataset
      firstInstace = true
      pageReload = true
      list = []
      list_gi = []
      list_lengths = []
      listGiFilter = []
      showDiv().then( () => {
        // removes nodes and forces adding same nodes
        setTimeout( () => {
          actualRemoval(g, graphics, onLoad, true)
        }, 100)
      })
    })
  } // closes renderGraph
  //}) //end of getArray

  const init = () => {
    if (firstInstace === true) {
      // the next if statement is only executed on development session, it
      // is way less efficient than the non development session.
      if (devel === true) {
        getArray.done(function (json) {
          $.each(json, function (sequence_info, dict_dist) {
            counter++
            // next we need to retrieve each information type independently
            const sequence = sequence_info.split("_").slice(0, 3).join("_")

            // and continues
            const seqLength = sequence_info.split("_").slice(-1).join("")
            const log_length = Math.log(parseInt(seqLength)) //ln seq length
            list_lengths.push(seqLength); // appends all lengths to this list
            list_gi.push(sequence)
            //checks if sequence is not in list to prevent adding multiple nodes for each sequence
            if (list.indexOf(sequence) < 0) {
              g.addNode(sequence, {
                sequence: "<span style='color:#468499'>Accession:" +
                " </span><a" +
                " href='https://www.ncbi.nlm.nih.gov/nuccore/" + sequence.split("_").slice(0, 2).join("_") + "' target='_blank'>" + sequence + "</a>",
                //species:"<font color='#468499'>Species:
                // </font>" + species,
                seq_length: "<span" +
                " style='color:#468499'>Sequence length:" +
                " </span>" + seqLength,
                log_length: log_length
              })
              list.push(sequence)

              if (dict_dist !== null) {
                // loops between all arrays of array pairing sequence and distances
                for (let i = 0; i < dict_dist.length; i++) {
                  const reference = Object.keys(dict_dist[i])[0]  // stores references in a unique variable
                  const distance = Object.values(dict_dist[i])[0].distance   // stores distances in a unique variable
                  g.addLink(sequence, reference, {distance})
                }
              } else {
                dict_dist = []
              }
            }
            // centers on node with more links
            storeMasterNode = storeRecenterDom(storeMasterNode, dict_dist, sequence, counter)
          })
          // precompute before rendering
          renderGraph(graphics)
        }) //new getArray end
      } else {
        // this renders the graph when not in development session
        // this is a more efficient implementation which takes a different
        // file for loading the graph.
        getArray.done(function (json) {
          graphSize = json.nodes.length
          const addAllNodes = (json) => {
            return new Promise((resolve, reject) => {
              for (const i in json) {
                const array = json[i]
                counter++
                const sequence = array.id
                const seqLength = array.length
                const log_length = Math.log(parseInt(seqLength))
                list_lengths.push(seqLength)
                list_gi.push(sequence)

                if (list.indexOf(sequence) < 0) {
                  g.addNode(sequence, {
                    sequence: "<span style='color:#468499'>Accession:" +
                    " </span><a" +
                    " href='https://www.ncbi.nlm.nih.gov/nuccore/" + sequence.split("_").slice(0, 2).join("_") + "' target='_blank'>" + sequence + "</a>",
                    seq_length: "<span" +
                    " style='color:#468499'>Sequence length:" +
                    " </span>" + seqLength,
                    log_length: log_length
                  })
                  list.push(sequence)
                  layout.setNodePosition(sequence, array.position.x, array.position.y)
                } else {
                  reject(`node wasn't added: ${sequence}`)
                }
                if (i + 1 === json.length) {
                  resolve("sucessfully added all nodes")
                }
              }
            })
          }

          const addAllLinks = (json) => {
            return new Promise((resolve, reject) => {
              for (const i in json) {
                const array = json[i]
                const sequence = array.parentId   // stores sequences
                const reference = array.childId  // stores references
                const distance = array.distance   // stores distances
                if (reference !== "") {
                  // here it adds only unique links because filtered.json file
                  // just stores unique links
                  g.addLink(sequence, reference, { distance })
                } else {
                  // if there is no reference associated with sequence then
                  // there are no links
                  reject(new Error(`link wasn't added: ${array.childId} -> ${sequence}`))
                }
                if (i + 1 === json.lenght) {
                  resolve("sucessefully added all links")
                }
              }
            })
          }

          addAllNodes(json.nodes)
            .then(addAllLinks(json.links))
            .then(renderGraph(graphics))
            // .then( () => {
            //   $("#loading").hide()
            //   $("#couve-flor").css("visibility", "visible")
            // })
            .catch((err) => {
              console.log(err)
            })
        })
      }
    } else {
      // storeMasterNode is empty in here
      if (readFilejson !== false) {
        const readReload = JSON.parse(Object.values(readFilejson)[readIndex])
        $("#fileNameDiv").html(Object.keys(readFilejson)[readIndex])
        $("#fileNameDiv").show()
        requestDBList = requesterDB(g, listGiFilter, counter, renderGraph,
          graphics, reloadAccessionList, renderer, list_gi, readReload,
          assemblyJson)
        // TODO do something similar to assembly
      } else {
        // sets pageReRun to true
        pageReRun = true
        // used when no reads are used to filter
        requestDBList = requesterDB(g, listGiFilter, counter, renderGraph,
          graphics, reloadAccessionList, renderer, list_gi, false,
          assemblyJson)
      }
      listGiFilter = requestDBList[0] // list with the nodes used to filter
      reloadAccessionList = requestDBList[1] //list stores all nodes present
      // this list_gi isn't the same as the initial but has information on
      // all the nodes that were used in filters
      // wait a while before showing the colors
      setTimeout( () => {
        renderer.rerender()
      }, 100)
    }
  }

  //* ***********************************************//
  // control the infile input and related functions //
  //* ***********************************************//

  handleFileSelect("infile", "#file_text", (newReadJson) => {
    readFilejson = newReadJson
    // $("#infile").val("")
  })

  handleFileSelect("mashInfile", "#file_text_mash", function (newMashJson) {
    mashJson = newMashJson
    // $("#mashInfile").val("")
  })

  handleFileSelect("assemblyfile", "#assembly_text", function (newAssemblyJson) {
    assemblyJson = newAssemblyJson
    // $("#assemblyfile").val("")
  })

  //* ****************************** *//
  //      Menu Button controls       //
  //* ****************************** *//

  $("#menu-toggle").on("click", function (e) {
    if (first_click_menu === true) {
      $("#menu-toggle").css( {"color": "#fff"} )
      first_click_menu = false
    } else {
      $("#menu-toggle").css( {"color": "#999999"} )
      first_click_menu = true
    }
  })

  // download button //
  $("#download_ds").unbind("click").bind("click", (e) => {
    // for now this is just taking what have been changed by taxa coloring
    if (areaSelection === true) {
      // downloads if area selection is triggered
      downloadSeqByColor(g, graphics)
    } else {
      // downloads when listGiFilter is defined, namely in taxa filters,
      // mapping results
      downloadSeq(listGiFilter, g)
    }
  })

  //*********//
  //* TABLE *//
  //*********//
  // function to add accession to bootstrapTableList in order to use in
  // downloadTable function or in submitTable button
  $("#metadataTable").on("check.bs.table", (e, row) => {
    if (bootstrapTableList.indexOf(row.id) < 0) {
      bootstrapTableList.push(row.id)
    }
  })
  // function to remove accession from bootstrapTableList in order to use in
  // downloadTable function or in submitTable button
    .on("uncheck.bs.table", (e, row) => {
      for (const value in bootstrapTableList) {
        if (bootstrapTableList[value] === row.id) {
          bootstrapTableList.splice(value, 1)
        }
      }
    })
    // function to handle when all are selected
    .on("check-all.bs.table", (e, rows) => {
      for (row in rows) {
        if (bootstrapTableList.indexOf(rows[row]) < 0) {
          bootstrapTableList.push(rows[row].id)
        }
      }
    })
    // function to remove when all are selected
    .on("uncheck-all.bs.table", (e, rows) => {
      bootstrapTableList = []
    })

  // function to control cell click
    .on("dbl-click-cell.bs.table", (field, value, row, element) => {
      console.log(g.getNode(element.id))

      recenterDOM(renderer, layout, [element.id, false])
      requestPlasmidTable(g.getNode(element.id), setupPopupDisplay)
    })

  // function to download dataset selected in table
  $("#downloadTable").unbind("click").bind("click", (e) => {
    // transform internal accession numbers to ncbi acceptable accesions
    const acc = bootstrapTableList.map((uniqueAcc) => {
      return uniqueAcc.split("_").splice(0,2).join("_")
    })
    multiDownload(acc, "nuccore", "fasta", fireMultipleDownloads)
  })

  // function to display heatmap dataset selected in table
  $("#heatmapButtonTab").unbind("click").bind("click", (e) => {
    // transform internal accession numbers to ncbi acceptable accesions
    if (readFilejson !== false) {
      heatmapMaker(masterReadArray, readFilejson)
      mash_json = false
      assemblyJson = false
    // }
    // else if (mash_json !== false) {
    //   heatmapMaker(masterReadArray, mash_json)
    //   readFilejson = false
    //   assembly_json = false
    } else if (assemblyJson !== false) {
      heatmapMaker(masterReadArray, assemblyJson)
      readFilejson = false
      mash_json = false
    }
  })
  // button to color selected nodes by check boxes
  $("#tableSubmit").unbind("click").bind("click", (e) => {
    $("#reset-sliders").click()
    $("#colorLegend").hide()
    // if bootstraTableList contains only one accession then showPopup
    if (bootstrapTableList.length === 1) {
      recenterDOM(renderer, layout, [bootstrapTableList[0], false])
      requestPlasmidTable(g.getNode(bootstrapTableList[0]), setupPopupDisplay)
    }
    console.log(bootstrapTableList)
    colorNodes(g, graphics, renderer, bootstrapTableList, "0xFF7000")
    // handles hidden buttons
    showRerun.style.display = "block"
    showGoback.style.display = "block"
    showDownload.style.display = "block"
    showTable.style.display = "block"
    plotButton.style.display = "block"
    // sets listGiFilter to the selected nodes
    listGiFilter = bootstrapTableList
    bootstrapTableList = []
    renderer.rerender()
  })

  // function to create table
  $("#tableShow").unbind("click").bind("click", (e) => {
    $("#tableModal").modal()
    // $("#metadataTable").bootstrapTable("destroy")
    $(".nav-tabs a[href='#homeTable']").tab("show")
    showDiv()
      .then( () => {
        previousTableList = makeTable(areaSelection, listGiFilter,
          previousTableList, g, graphics, graphSize)
      })
  })

  // function to close table
  $("#cancelTable").unbind("click").bind("click", (e) => {
    $("#tableModal").modal("toggle")
  })

  // popup button for download csv
  // this only does single entry exports, for more exports table should be used
  $("#downloadCsv").unbind("click").bind("click", () => {
  // $(document).on("click", "#downloadCsv", () => {

    const quickFixString = (divNameList) => {
      let returnArray = []
      for (i in divNameList) {
        const divName = divNameList[i]
        returnArray.push($(divName).text().replace(":", ",").trim())
      }
      return returnArray
    }
    // execute the same replacement function for all this divs
    const targetArray = quickFixString([
      "#accessionPop",
      "#speciesNamePop",
      "#lengthPop",
      "#plasmidNamePop",
      "#percentagePop",
      "#copyNumberPop",
      "#cardPop",
      "#cardGenePop",
      "#cardGenbankPop",
      "#cardAroPop",
      "#cardCoveragePop",
      "#cardIdPop",
      "#cardRangePop",
      "#resfinderPop",
      "#resfinderGenePop",
      "#resfinderGenbankPop",
      "#resfinderCoveragePop",
      "#resfinderIdPop",
      "#resfinderRangePop",
      "#pfPop",
      "#pfGenePop",
      "#pfGenbankPop",
      "#pfCoveragePop",
      "#pfIdentityPop",
      "#pfRangePop",
      "#clusterIdPop"
    ])
    // then convert the resulting array to a csv file
    arrayToCsv(targetArray)
  })

  const emptyFiles = () => {
    $("#infile").val("")
    $("#mashInfile").val("")
    $("#assemblyfile").val("")
    readFilejson = false
    mash_json = false
    assemblyJson = false
  }

  $("#uploadFile").unbind("click").bind("click", () => {
    emptyFiles()
  })
  $("#uploadFileMash").unbind("click").bind("click", () => {
    emptyFiles()
  })
  $("#uploadFileAssembly").unbind("click").bind("click", () => {
    emptyFiles()
  })

  // resistance button control //
  $("#resButton").unbind("click").bind("click", () => {
    // $("#resTab").show()
    // if (clickedPopupButtonCard === true) {
    // $("#pfTab").hide()
    // $("#popupTabs").show()
    clickedPopupButtonCard = resGetter(currentQueryNode)
    // $("#pfTab").empty()
    // } else {
    // when it is already queried and we are just cycling b/w the two divs
    // (tabs) then just show and hide the respective divs
    // $("#resTab").show()

    // }
  })

  $("#plasmidButton").unbind("click").bind("click", () => {
    // $("#pfTab").show()
    // if (clickedPopupButtonFamily === true) {
    // $("#popupTabs").show()
    // $("#resTab").hide()
    clickedPopupButtonFamily = plasmidFamilyGetter(currentQueryNode)
    // $("#resTab").empty()
    // } else {
    // when it is already queried and we are just cycling b/w the two divs
    // (tabs) then just show and hide the respective divs
    // $("#pfTab").show()
    // }
  })

  // control the alertClose button
  $("#alertClose").unbind("click").bind("click", () => {
    $("#alertId").hide()  // hide this div
  })

  $("#alertClose_search").unbind("click").bind("click", () => {
    $("#alertId_search").hide()  // hide this div
  })

  $("#alertCloseNCBI").unbind("click").bind("click", () => {
    $("#alertNCBI").hide()  // hide this div
  })

  /** control the visualization of multiple files for read mode
  * The default idea is that the first file in this readFilejson object is the
  * one to be loaded when uploading then everything else should use cycler
  */
  $("#slideRight").unbind("click").bind("click", () => {
    resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
    const outArray = slideToRight(readFilejson, readIndex, g, list_gi, graphics, renderer)
    readIndex = outArray[0]
    listGiFilter = outArray[1][1]
    list_gi = outArray[1][0]

  })

  $("#slideLeft").unbind("click").bind("click", () => {
    resetAllNodes(graphics, g, nodeColor, renderer, idsArrays)
    const outArray = slideToLeft(readFilejson, readIndex, g, list_gi, graphics, renderer)
    readIndex = outArray[0]
    listGiFilter = outArray[1][1]
    list_gi = outArray[1][0]
  })

  // changes the behavior of tooltip to show only on click
  $("#questionPlots").popover()

  $("#questionTable").popover()

  // function to avoid shift key to be triggered when any modal is open
  $(".modal").on("shown.bs.modal", () => {
    multiSelectOverlay = "disable"
  })

  /**
  * function to allow shift key to select nodes again, on modal close
  */
  $(".modal").on("hidden.bs.modal", () => {
    multiSelectOverlay = false
    // this force question buttons to close if tableModal and modalPlot are
    // closed
    $("#questionTable").popover("hide")
    $("#questionPlots").popover("hide")
  })

  // this forces the entire script to run
  init() //forces main json or the filtered objects to run before
  // rendering the graph

  /**
   * function for keyboard shortcut to save file with node positions
   * This is only useful if devel is true and should be disabled by default
   * for users
   */
  Mousetrap.bind("shift+ctrl+space", () => {
    initCallback(g, layout, devel)
  })
} // closes onload
