/*globals speciesRequest, taxaRequest, resRequest, pfRequest, virRequest,
listGiFilter, colorNodes, selectedFilter, blockFilterModal*/

/**
 * Function to calculate intersection between arrays. Note that this function
 * cannot receive empty arrays because that will cause the final intersection
 * to be nothing.
 * @param {Array} arr - This variable must be an array of arrays
 * @returns {Array} - returns an array with all the entries that are common in
 * all the arrays present in the initial array of arrays.
 */
const arraysIntersection = (arr) => {

  // sort by asceding order of array lenght
  arr.sort( (a, b) => {
    return a.length - b.length
  })

  // get first array as reference and the remaining as others
  const ref = arr[0],
    other = arr.slice(1,)

  let common = []
  let save

  // iterate through all reference entries. The rational is that each one of the other arrays must have the entries in ref.
  for (const el of ref){
    save = true
    for (const lst of other) {
      // if array lst doesn't have el then save is set to false, which will not save it to common list/array
      if (!lst.includes(el)) {
        save = false
      }
    }
    if (save) {
      common.push(el)
    }
  }

  return common
}

/**
 * Function that merges an array of arrays and removes the duplicates entries
 * from the resulting array
 * @param {Array} arr - Any array of arrays with strings
 * @returns {Array} - A unique array with unique entries
 */
const mergeNRemoveDuplicatesFromArray = (arr) => {
  // sum arrays
  let mergedListRes = [].concat.apply([], arr)
  // remove duplicates from array
  mergedListRes = mergedListRes.filter( (item, pos, self)  => {
    return self.indexOf(item) === pos
  })

  return mergedListRes
}

/**
 * Function that controls if a selector is being clicked for the first time
 * or if it is being deselected in order to allow to use other selectors
 * from the same level. For example, this prevents that multiple taxa selectors
 * are used at the same time
 * @param {boolean|String} lastTaxaSelector - The variable that controls the
 * last selector that was clicked. When nothing is selected it is false,
 * otherwise it will store the string with the last element that was clicked.
 * @param {Object} e - The object with the event
 * @param {Array} arrayOfSelectors - An array with all the ids of the selectors
 * to control.
 * @returns {boolean|String}
 */
const controlFiltersSameLevel = (lastTaxaSelector, e, arrayOfSelectors) => {

  // if lastTaxaSelector is false then disable all other selectors than the one
  //being clicked
  if (lastTaxaSelector === false) {
    for (const selector of arrayOfSelectors) {
      if (selector !== e.target.id) {
        $(`#${selector}`).prop("disabled", true)
      }
    }
    lastTaxaSelector = e.target.id
  } 

  // a reduced to check if arrayOfSelectors is getting empty or not
  const listCheck = arrayOfSelectors.reduce( (total, selector) => 
    total + $(`#${selector}`).selectpicker("val").length, 0
  )

  // if listCheck is 0 then any dropdown can be selected again resseting 
  // lastTaxaSelector to false
  if (listCheck === 0) {
    for (const selector of arrayOfSelectors) {
      $(`#${selector}`).prop("disabled", false)
    }
    return false
  } else {
    return lastTaxaSelector
  }
}

/**
 * A function that is used to parse promises resulting from requests to psql db
 * and retrieves a list of the accession numbers queried
 * @param {Array} requestConst - An array of promises from post requests
 * @returns {Array} - returns a list of accession numbers as an array
 */
const mapRequest = (requestConst) => {
  let requestList = []
  if (requestConst !==  false) {
    requestConst.map( (request) => {
      requestList.push(request.plasmid_id)
    })
  }
  return requestList
}

/**
 * Function that sets the lis to be added to the legend for intersection and
 * union queries.
 * @param {Object} objectOfSelections - The object with all the selections made
 * through the select menus available in the intersection and union modals
 * (advanced filters --> combined selections)
 * @param currentColor - the current color being used
 * @param selectedFilter - the name of the current filter. e.g. ermc for
 * resistance
 * @returns {string}
 */
const setStoreLis = (objectOfSelections, currentColor, selectedFilter) => {

  let storeLis = "<li class='centeredList'><button" +
    " class='jscolor btn btn-default' style='background-color: " +
    currentColor.toString().replace("0x", "#") + "'></button>&nbsp;" +
    selectedFilter + "</li>"

  return storeLis + "</li>"
}

/**
 * A Function to parse the intersections menu queries
 * @param {Object} g - object that stores vivagraph graph associated functions.
 * @param {Object} graphics - vivagraph functions related with node and link
 * data.
 * @param {Function} renderer - Function that forces the graph to be updated.
 * @param {Object} objectOfSelections - The object with all the selections made
 * through the select menus available in the intersection and union modals
 * (advanced filters --> combined selections)
 * @returns {Promise<*>}
 */
const parseQueriesIntersection = async (g, graphics, renderer,
                                        objectOfSelections,
                                        typeOfSubmission) => {

  // first parse the multitude of taxa entries and resistance entries available
  const taxa = (objectOfSelections.order.length > 0) ? objectOfSelections.order
    : (objectOfSelections.family.length > 0) ? objectOfSelections.family
      : (objectOfSelections.genus.length > 0) ? objectOfSelections.genus
        : (objectOfSelections.species.length > 0) ? objectOfSelections.species
          : false

  const res = (objectOfSelections.card.length > 0) ? objectOfSelections.card
    : (objectOfSelections.resfinder.length > 0) ? objectOfSelections.resfinder
      : false

  let listTaxa = []

  if (taxa !== false) {

    for (const t of taxa) {

      const taxaQueryResults = (taxa === objectOfSelections.species) ?
        await speciesRequest(g, graphics, renderer, t, false) :
        await taxaRequest(g, graphics, renderer, t, false)

      // get accessions from taxa requests
      listTaxa.push(mapRequest(taxaQueryResults))

    }

    // merge results and remove duplicates
    listTaxa = mergeNRemoveDuplicatesFromArray(listTaxa)

  }

  let listRes = []

  if (res !== false) {
    // since it is possible to select more than one resistance it is necessary
    // to iterate through each resistance and append the results to a list
    // (listRes).
    for (const r of res) {
      const resHandle = await resRequest(g, graphics, renderer, r, false)
      listRes.push(mapRequest(resHandle))
    }

    // merge results and remove duplicates
    listRes = mergeNRemoveDuplicatesFromArray(listRes)
  }

  let listPf = []

  if (objectOfSelections.pfinder.length > 0) {

    for (const pf of objectOfSelections.pfinder) {
      // since it is possible to select more than one plasmid family it is necessary
      // to iterate through each resistance and append the results to a list
      // (listPf).
      const pfHandle = await pfRequest(g, graphics, renderer, pf, false)
      listPf.push(mapRequest(pfHandle))
    }

    // merge results and remove duplicates
    listPf = mergeNRemoveDuplicatesFromArray(listPf)
  }

  let listVir = []

  if (objectOfSelections.virulence.length > 0) {

    for (const vir of objectOfSelections.virulence) {

      const virHandle = await virRequest(g, graphics, renderer, vir, false)
      listVir.push(mapRequest(virHandle))
    }

    // merge results and remove duplicates
    listVir = mergeNRemoveDuplicatesFromArray(listVir)
  }

  let listMetal = []

  if (objectOfSelections.metal.length > 0) {

    for (const metal of objectOfSelections.metal) {

      const metalHandle = await metalRequest(g, graphics, renderer, metal, false)
      listMetal.push(mapRequest(metalHandle))
    }

    // merge results and remove duplicates
    listMetal = mergeNRemoveDuplicatesFromArray(listMetal)

  }

  // remove empty arrays
  let arrayOfArrays = [listTaxa, listRes, listPf, listVir, listMetal]
  arrayOfArrays = arrayOfArrays.filter( (n) => { return n.length !== 0 })

  // here arrayOfArrays must not have empty arrays

  let selectedColor

  if (typeOfSubmission === "intersection") {

    listGiFilter = await arraysIntersection(arrayOfArrays)
    selectedColor = "0x" + "#0076c3".replace("#", "")
    selectedFilter = "∩"

  } else {

    listGiFilter = await mergeNRemoveDuplicatesFromArray(arrayOfArrays)
    selectedColor = "0x" + "#339e0b".replace("#", "")
    selectedFilter = "∪"

  }

  // parsing to write the intersection or union string
  const taxaStrings = (taxa) && taxa.join(" ∪ ")
  const resStrings = (res) && res.join(" ∪ ")
  const virStrings = (objectOfSelections.virulence) &&
    objectOfSelections.virulence.join(" ∪ ")
  const pfStrings = (objectOfSelections.pfinder) &&
    objectOfSelections.pfinder.join(" ∪ ")
  const metalStrings = (objectOfSelections.metal) &&
    objectOfSelections.metal.join(" ∪ ")

  let stringToSelection = ""

  // loop to write stringToSelection
  for (const el of [taxaStrings, pfStrings, resStrings, virStrings,
    metalStrings]){
    if (el) {
      stringToSelection += `[${el}] <b>${selectedFilter}</b> `
    }
  }

  // removes last selected filter from stringToSelection
  stringToSelection = stringToSelection.substring(0,
    stringToSelection.length - 9)

  // color nodes after having tempList
  await colorNodes(g, graphics, renderer, listGiFilter, selectedColor)

  // after everything is done then render the respective divs
  $("#loading").hide()

  // check if there is any selection
  if (listGiFilter.length !== 0) {
    const storeLis = setStoreLis(objectOfSelections, selectedColor, stringToSelection)
    $("#readString, #readLegend").empty()
    $("#read_label, #fileNameDiv").hide()

    $("#colorLegend, #advanced_label").show()

    $("#colorLegendBoxAdvanced").empty()
      .append(storeLis +
        "<li class='centeredList'><button class='jscolor btn btn-default'" +
        " style='background-color:#666370' ></button>&nbsp;unselected</li>")

    $("#Re_run, #go_back, #download_ds, #tableShow, #heatmapButtonTab," +
      " #plotButton").show()
    // enables button group again
    $("#toolButtonGroup button").removeAttr("disabled")

    // if blockFilterModal is false then show modal that allows to show
    // buttons to filter or not the current selection right ahead
    if (!blockFilterModal) { await $("#reRunModalResults").modal("show") }
  } else {
    // if no selection was made...
    $("#alertNoSelection").show()
  }

}
