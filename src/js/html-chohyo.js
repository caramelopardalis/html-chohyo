export const htmlChohyo = {};

const WALKER_ASYNC_PROCESS_COUNT = 100
const SHRINK_ASYNC_PROCESS_COUNT = 100

let pageMarginTop
let pageHeader
let pageFooter
let pageMarginBottom

htmlChohyo.preview = async () => {
    await pagerize()
}

const pagerize = async () => {
    const contentContainer = document.getElementsByClassName('chohyo-content')[0]

    wrapOriginalElements(contentContainer)
    addMetadata(contentContainer)
    cutFixedContents(contentContainer)

    const pagesContainer = document.createElement('div')
    pagesContainer.classList.add('chohyo-pages-container')
    document.body.appendChild(pagesContainer)

    let page = new Page()
    pagesContainer.appendChild(page.container)

    let shrinkCount = 0

    const pageBreakIfOverflowed = async (clonedCurrentElement, currentElement) => {
        if (clonedCurrentElement.classList.contains('chohyo-page-break')) {
            page = new Page()
            pagesContainer.appendChild(page.container)
            return
        }

        if (page.getContentHeight() <= page.getHeight()) {
            return
        }

        if (!clonedCurrentElement.classList.contains('chohyo-grid-data-inner')) {
            moveToNextPage(clonedCurrentElement)
            return
        }

        const originalNearestGroup = currentElement.closest('.chohyo-group')
        // TODO check originalNearestGroup null
        const clonedOriginalNearestGroup = originalNearestGroup.cloneNode(true)

        // replace the nearest group in page to the original nearest group (because next siblings not yet copied)
        const insertedNearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + clonedOriginalNearestGroup.getAttribute('data-chohyo-id') + '"]')
        insertedNearestGroup.parentElement.insertBefore(clonedOriginalNearestGroup, insertedNearestGroup)
        insertedNearestGroup.parentElement.removeChild(insertedNearestGroup)

        while (page.getHeight() < page.getContentHeight()) {
            let dataInNearestGroup

            while (page.getHeight() < page.getContentHeight()) {
                if (++shrinkCount === SHRINK_ASYNC_PROCESS_COUNT) {
                    shrinkCount = 0
                    await shrink(currentElement)
                } else {
                    shrinkSync(currentElement)
                }

                if (!hasData(currentElement)) {
                    // move the group to next page
                    const nearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + originalNearestGroup.getAttribute('data-chohyo-id') + '"]')
                    dataInNearestGroup = nearestGroup.querySelectorAll(':scope .chohyo-grid-data')
                    for (const datumInNearestGroup of dataInNearestGroup) {
                        datumInNearestGroup.setAttribute('data-chohyo-removed-count', 0)
                        datumInNearestGroup.removeAttribute('data-chohyo-shrink-begin')
                        datumInNearestGroup.removeAttribute('data-chohyo-shrink-end')
                        datumInNearestGroup.removeAttribute('data-chohyo-success-shrinking')
                        contentContainer.querySelector(':scope [data-chohyo-id="' + datumInNearestGroup.getAttribute('data-chohyo-id') + '"]').setAttribute('data-chohyo-removed-count', 0)
                    }
                    nearestGroup.parentElement.removeChild(nearestGroup)
                    copyGroupToNextPage(currentElement)
                }
            }

            const nearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + originalNearestGroup.getAttribute('data-chohyo-id') + '"]')
            dataInNearestGroup = nearestGroup.querySelectorAll(':scope .chohyo-grid-data')
            for (const datumInNearestGroup of dataInNearestGroup) {
                if (0 < parseInt(datumInNearestGroup.getAttribute('data-chohyo-removed-count'))) {
                    copyGroupToNextPage(currentElement)

                    const newNearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + originalNearestGroup.getAttribute('data-chohyo-id') + '"]')
                    const newDataInNearestGroup = newNearestGroup.querySelectorAll(':scope .chohyo-grid-data')
                    for (const newDatumInNearestGroup of newDataInNearestGroup) {
                        const removedCount = parseInt(newDatumInNearestGroup.getAttribute('data-chohyo-removed-count'))
                        const startIndex = parseInt(newDatumInNearestGroup.getAttribute('data-chohyo-start-index'))
                        const originalText = newDatumInNearestGroup.getAttribute('data-chohyo-original-text')
                        let newStartIndex = startIndex === 0 ? originalText.length - removedCount : startIndex + (originalText.length - startIndex - removedCount)

                        newDatumInNearestGroup.setAttribute('data-chohyo-removed-count', 0)
                        newDatumInNearestGroup.removeAttribute('data-chohyo-shrink-begin')
                        newDatumInNearestGroup.removeAttribute('data-chohyo-shrink-end')
                        newDatumInNearestGroup.removeAttribute('data-chohyo-success-shrinking')
                        contentContainer.querySelector(':scope [data-chohyo-id="' + newDatumInNearestGroup.getAttribute('data-chohyo-id') + '"]').setAttribute('data-chohyo-removed-count', 0)

                        if (removedCount === 0) {
                            newStartIndex = 0
                        } else if (originalText.length <= newStartIndex || newStartIndex < 0) {
                            newStartIndex = originalText.length
                        }

                        newDatumInNearestGroup.setAttribute('data-chohyo-start-index', newStartIndex)
                        contentContainer.querySelector(':scope [data-chohyo-id="' + newDatumInNearestGroup.getAttribute('data-chohyo-id') + '"]').setAttribute('data-chohyo-start-index', newStartIndex)
                        const inner = newDatumInNearestGroup.querySelector(':scope > .chohyo-grid-data-inner')
                        inner.textContent = originalText.substring(newStartIndex)
                    }

                    break
                }
            }
        }
    }

    const shrink = async (currentElement) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                shrinkSync(currentElement)
                resolve()
            }, 0)
        })
    }

    const shrinkSync = (currentElement) => {
        const originalNearestGroup = currentElement.closest('.chohyo-group')
        const nearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + originalNearestGroup.getAttribute('data-chohyo-id') + '"]')
        const dataInNearestGroup = nearestGroup.querySelectorAll(':scope .chohyo-grid-data')

        while (true) {
            let mostHighestHeight = 0
            let mostHighestElement
            for (const datumInNearestGroup of dataInNearestGroup) {
                const inner = datumInNearestGroup.querySelector(':scope > .chohyo-grid-data-inner')
                const height = getLayout(inner).height
                if (!datumInNearestGroup.hasAttribute('data-chohyo-success-shrinking')
                    && (
                        mostHighestHeight < height
                        || (mostHighestHeight === height
                            && mostHighestElement
                            && mostHighestElement.textContent.length < datumInNearestGroup.textContent.length
                        )
                    )) {
                    mostHighestHeight = height
                    mostHighestElement = datumInNearestGroup
                }
            }

            if (mostHighestElement) {
                const originalText = mostHighestElement.getAttribute('data-chohyo-original-text')
                const startIndex = parseInt(mostHighestElement.getAttribute('data-chohyo-start-index'))
                const removedCount = parseInt(mostHighestElement.getAttribute('data-chohyo-removed-count'))
                const remainedText = originalText.substring(startIndex, originalText.length - removedCount)
                const inner = mostHighestElement.querySelector(':scope > .chohyo-grid-data-inner')

                let shrinkBegin = mostHighestElement.hasAttribute('data-chohyo-shrink-begin') ? parseInt(mostHighestElement.getAttribute('data-chohyo-shrink-begin')) : startIndex
                let shrinkEnd = mostHighestElement.hasAttribute('data-chohyo-shrink-end') ? parseInt(mostHighestElement.getAttribute('data-chohyo-shrink-end')) : originalText.length
                let shrinkedText = originalText.substring(startIndex, shrinkEnd)

                // Mark the element as 👌 if remove a one character in it and it has become not overflow
                // Success the shrinking when all data was marked as 👌 in the group

                inner.textContent = shrinkedText
                if (page.getHeight() < page.getContentHeight()) {
                    inner.textContent = shrinkedText.substring(0, shrinkedText.length - 1)
                    if (page.getContentHeight() <= page.getHeight()) {
                        mostHighestElement.setAttribute('data-chohyo-removed-count', originalText.length - shrinkEnd + 1)
                        contentContainer.querySelector(':scope [data-chohyo-id="' + mostHighestElement.getAttribute('data-chohyo-id') + '"]').setAttribute('data-chohyo-removed-count', originalText.length - shrinkEnd + 1)
                        mostHighestElement.removeAttribute('data-chohyo-shrink-begin')
                        mostHighestElement.removeAttribute('data-chohyo-shrink-end')
                        mostHighestElement.setAttribute('data-chohyo-success-shrinking', true)
                    }
                }

                if (page.getContentHeight() <= page.getHeight()) {
                    for (const datumInNearestGroup of dataInNearestGroup) {
                        const datumOriginalText = datumInNearestGroup.getAttribute('data-chohyo-original-text')
                        const datumStartIndex = parseInt(datumInNearestGroup.getAttribute('data-chohyo-start-index'))
                        const datumRemovedCount = parseInt(datumInNearestGroup.getAttribute('data-chohyo-removed-count'))
                        const datumRemainedText = datumOriginalText.substring(datumStartIndex, datumOriginalText.length - datumRemovedCount)
                        const datumShrinkBegin = datumInNearestGroup.hasAttribute('data-chohyo-shrink-begin') ? parseInt(datumInNearestGroup.getAttribute('data-chohyo-shrink-begin')) : datumStartIndex
                        const datumShrinkEnd = datumInNearestGroup.hasAttribute('data-chohyo-shrink-end') ? parseInt(datumInNearestGroup.getAttribute('data-chohyo-shrink-end')) : datumOriginalText.length
                        const datumShrinkedText = datumOriginalText.substring(datumStartIndex, datumShrinkEnd)
                        if (datumOriginalText.substring(datumStartIndex).length === datumInNearestGroup.textContent.length) {
                            datumInNearestGroup.setAttribute('data-chohyo-removed-count', 0)
                            contentContainer.querySelector(':scope [data-chohyo-id="' + datumInNearestGroup.getAttribute('data-chohyo-id') + '"]').setAttribute('data-chohyo-removed-count', 0)
                            datumInNearestGroup.removeAttribute('data-chohyo-shrink-begin')
                            datumInNearestGroup.removeAttribute('data-chohyo-shrink-end')
                            datumInNearestGroup.setAttribute('data-chohyo-success-shrinking', true)
                        }
                    }
                }

                if (!mostHighestElement.hasAttribute('data-chohyo-success-shrinking')) {
                    if (shrinkedText.length === 1) {
                        shrinkEnd = startIndex
                    } else {
                        const leftHalfText = originalText.substring(startIndex, shrinkBegin + Math.ceil((shrinkEnd - shrinkBegin) / 2))
                        inner.textContent = leftHalfText
                        if (page.getContentHeight() <= page.getHeight()) {
                            // use right
                            shrinkBegin = shrinkBegin + Math.ceil((shrinkEnd - shrinkBegin) / 2)
                        } else {
                            // use left
                            shrinkEnd = shrinkBegin + Math.ceil((shrinkEnd - shrinkBegin) / 2)
                        }
                    }

                    if (parseInt(mostHighestElement.getAttribute('data-chohyo-shrink-begin')) === shrinkBegin
                        && parseInt(mostHighestElement.getAttribute('data-chohyo-shrink-end')) === shrinkEnd) {
                        shrinkBegin = startIndex
                        shrinkEnd = originalText.length
                    }

                    mostHighestElement.setAttribute('data-chohyo-shrink-begin', shrinkBegin)
                    mostHighestElement.setAttribute('data-chohyo-shrink-end', shrinkEnd)
                }
            }

            let hasData = false
            for (const datumInNearestGroup of dataInNearestGroup) {
                const inner = datumInNearestGroup.querySelector(':scope > .chohyo-grid-data-inner')
                if (0 < inner.textContent.length) {
                    hasData = true
                    break
                }
            }
            if (!hasData) {
                break
            }

            let allShrinked = true
            for (const datumInNearestGroup of dataInNearestGroup) {
                if (!datumInNearestGroup.hasAttribute('data-chohyo-success-shrinking')) {
                    allShrinked = false
                    break
                }
            }
            if (allShrinked) {
                break
            }
        }
    }

    const hasData = (currentElement) => {
        const originalNearestGroup = currentElement.closest('.chohyo-group')
        const nearestGroup = page.container.querySelector(':scope [data-chohyo-id="' + originalNearestGroup.getAttribute('data-chohyo-id') + '"]')
        const dataInNearestGroup = nearestGroup.querySelectorAll(':scope .chohyo-grid-data-inner')

        for (const datumInNearestGroup of dataInNearestGroup) {
            if (0 < datumInNearestGroup.textContent.length) {
                return true
            }
        }

        return false
    }

    const moveToNextPage = (element) => {
        let ancestorGroup = element.closest('.chohyo-group')

        if (!ancestorGroup) {
            page = new Page()
            pagesContainer.appendChild(page.container)
            page.appendChild(element)
            return
        }

        const ancestorGroups = []
        const ancestorGroupsIds = []
        while (ancestorGroup) {
            ancestorGroups.push(ancestorGroup)
            ancestorGroupsIds.push(ancestorGroup.getAttribute('data-chohyo-id'))
            ancestorGroup = ancestorGroup.parentElement.closest('.chohyo-group')
        }

        const clonedFarthestGroup = ancestorGroups[ancestorGroups.length - 1].cloneNode(true)
        const closestGroup = element.closest('.chohyo-group')
        closestGroup.parentElement.removeChild(closestGroup)

        const groupedGroups = clonedFarthestGroup.querySelectorAll(':scope .chohyo-group')
        for (const groupedGroup of groupedGroups) {
            if (!ancestorGroupsIds.includes(groupedGroup.getAttribute('data-chohyo-id'))) {
                groupedGroup.parentElement.removeChild(groupedGroup)
            }
        }

        page = new Page()
        pagesContainer.appendChild(page.container)
        page.appendChild(clonedFarthestGroup)
    }

    const copyGroupToNextPage = (currentElement) => {
        const ancestorGroups = []
        const ancestorGroupsIds = []
        let ancestorGroup = currentElement.closest('.chohyo-group')
        while (ancestorGroup) {
            ancestorGroups.push(ancestorGroup)
            ancestorGroupsIds.push(ancestorGroup.getAttribute('data-chohyo-id'))
            ancestorGroup = ancestorGroup.parentElement.closest('.chohyo-group')
        }

        const clonedFarthestGroup = ancestorGroups[ancestorGroups.length - 1].cloneNode(true)

        const groupedGroups = clonedFarthestGroup.querySelectorAll(':scope .chohyo-group')
        for (const groupedGroup of groupedGroups) {
            if (!ancestorGroupsIds.includes(groupedGroup.getAttribute('data-chohyo-id'))) {
                groupedGroup.parentElement.removeChild(groupedGroup)
            }
        }

        page = new Page()
        pagesContainer.appendChild(page.container)
        page.appendChild(clonedFarthestGroup)
    }

    await walkDescendant(contentContainer, async (currentElement) => {
        const parent = page.container.querySelector(':scope [data-chohyo-id="' + currentElement.parentElement.getAttribute('data-chohyo-id') + '"]')
        const clonedCurrentElement = currentElement.cloneNode(false)
        for (let i = 0; i < currentElement.childNodes.length; i++) {
            if (currentElement.childNodes[i].nodeType === Node.TEXT_NODE) {
                clonedCurrentElement.appendChild(currentElement.childNodes[i].cloneNode(false))
            }
        }
        if (!parent) {
            if (!page.container.querySelector(':scope [data-chohyo-id="' + clonedCurrentElement.getAttribute('data-chohyo-id') + '"]')) {
                page.appendChild(clonedCurrentElement)
            }
        } else {
            if (!parent.querySelector(':scope [data-chohyo-id="' + clonedCurrentElement.getAttribute('data-chohyo-id') + '"]')) {
                parent.appendChild(clonedCurrentElement)
            }
        }

        await pageBreakIfOverflowed(clonedCurrentElement, currentElement)
    }, complete)
}

const complete = async () => {
    const content = document.getElementsByClassName('chohyo-content')[0]
    content.parentElement.removeChild(content)

    let count = 0
    const pages = document.querySelectorAll('.chohyo-page')
    for (const page of pages) {
        ++count
        const pageNumber = page.querySelector(':scope .chohyo-page-number')
        pageNumber && (pageNumber.textContent = count)
        const totalNumber = page.querySelector(':scope .chohyo-total-number')
        totalNumber && (totalNumber.textContent = pages.length)
    }

    await hideIndicator()
}

const hideIndicator = async () => {
    const container = document.querySelector('.chohyo-indicator-container')
    if (container) {
        document.body.removeChild(container)
    }
}

const wrapOriginalElements = (contentContainer) => {
    const data = contentContainer.querySelectorAll(':scope .chohyo-grid-data')
    for (const datum of data) {
        const inner = document.createElement('div')
        inner.classList.add('chohyo-grid-data-inner')
        while (datum.childNodes.length) {
            inner.appendChild(datum.childNodes[0])
        }
        datum.appendChild(inner)
    }
}

const addMetadata = (contentContainer) => {
    const originals = contentContainer.querySelectorAll(':scope *')
    for (const original of originals) {
        original.setAttribute('data-chohyo-id', uuid())
    }
    const data = contentContainer.querySelectorAll(':scope .chohyo-grid-data')
    for (const datum of data) {
        datum.setAttribute('data-chohyo-start-index', 0)
        datum.setAttribute('data-chohyo-removed-count', 0)
        datum.setAttribute('data-chohyo-original-text', datum.textContent)
    }
}

const cutFixedContents = (contentContainer) => {
    pageMarginTop = contentContainer.querySelector(':scope .chohyo-page-margin-top')
    if (pageMarginTop) {
        pageMarginTop.parentElement.removeChild(pageMarginTop)
    } else {
        pageMarginTop = document.createElement('div')
        pageMarginTop.classList.add('chohyo-page-margin-top')
    }

    pageHeader = contentContainer.querySelector(':scope .chohyo-page-header')
    if (pageHeader) {
        pageHeader.parentElement.removeChild(pageHeader)
    } else {
        pageHeader = document.createElement('div')
        pageHeader.classList.add('chohyo-page-header')
    }

    pageFooter = contentContainer.querySelector(':scope .chohyo-page-footer')
    if (pageFooter) {
        pageFooter.parentElement.removeChild(pageFooter)
    } else {
        pageFooter = document.createElement('div')
        pageFooter.classList.add('chohyo-page-footer')
    }

    pageMarginBottom = contentContainer.querySelector(':scope .chohyo-page-margin-bottom')
    if (pageMarginBottom) {
        pageMarginBottom.parentElement.removeChild(pageMarginBottom)
    } else {
        pageMarginBottom = document.createElement('div')
        pageMarginBottom.classList.add('chohyo-page-margin-bottom')
    }
}

const walkDescendant = async (root, elementHandler, completeHandler) => {
    let currentElement = root
    let processCount = 0
    const walk = async () => {
        if (currentElement !== root) {
            await processCurrentElement()
        }

        if (0 < currentElement.children.length) {
            currentElement = currentElement.children[0]
        } else if (currentElement.nextElementSibling) {
            currentElement = currentElement.nextElementSibling
        } else {
            let element = currentElement
            while (element.parentElement) {
                if (element.parentElement === root) {
                    if (completeHandler) {
                        await completeHandler()
                    }
                    return;
                }
                if (element.parentElement.nextElementSibling) {
                    break
                }
                element = element.parentElement
            }
            currentElement = element.parentElement.nextElementSibling
        }

        if (WALKER_ASYNC_PROCESS_COUNT === processCount) {
            processCount = 0
            setTimeout(walk, 0)
        } else {
            walk()
        }
    }
    const processCurrentElement = async () => {
        ++processCount

        await elementHandler(currentElement)
    }
    await walk()
}

const getLayout = (element) => {
    return element.getBoundingClientRect()
}

const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

const loadScripts = (urls, callback) => {
    if (urls.length) {
        loadScript(urls[0], () => {
            urls = urls.slice(1)
            loadScripts(urls, callback)
        })
    } else {
        callback()
    }
}

const loadScript = (url, callback) => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = false
    script.src = url

    if (script.readyState) {
        script.onreadystatechange = () => {
            if (script.readyState === 'loaded' || script.readyState === 'complete') {
                script.onreadystatechange = null
                callback()
            }
        }
    } else {
        script.onload = () => {
            callback()
        }
    }
    document.getElementsByTagName('body')[0].appendChild(script)
}

class Page {
    constructor() {
        this.container = this.createContainer()
        this.containerInner = this.createContainerInner()
        this.container.appendChild(this.containerInner)

        this.contentOutlineOuter = this.createContentOutlineOuter()
        this.containerInner.appendChild(this.contentOutlineOuter)
        this.contentOutline = this.createContentOutline()
        this.contentOutlineOuter.appendChild(this.contentOutline)
        this.contentOutlineInner = this.createContentOutlineInner()
        this.contentOutline.appendChild(this.contentOutlineInner)

        this.marginTop = pageMarginTop.cloneNode(true)
        this.contentOutlineOuter.insertBefore(this.marginTop, this.contentOutline)

        this.header = pageHeader.cloneNode(true)
        this.contentOutlineInner.appendChild(this.header)
        this.footer = pageFooter.cloneNode(true)
        this.contentOutlineInner.appendChild(this.footer)

        this.marginBottom = pageMarginBottom.cloneNode(true)
        this.contentOutlineOuter.appendChild(this.marginBottom)
    }

    appendChild(element) {
        this.contentOutlineInner.insertBefore(element, this.footer)
    }

    createContainer() {
        const element = document.createElement('div')
        element.className = 'chohyo-page'
        return element
    }

    createContainerInner() {
        const element = document.createElement('div')
        element.className = 'chohyo-page-inner'
        return element
    }

    createContentOutlineOuter() {
        const element = document.createElement('div')
        element.className = 'chohyo-content-outline-outer'
        return element
    }

    createContentOutline() {
        const element = document.createElement('div')
        element.className = 'chohyo-content-outline'
        return element
    }

    createContentOutlineInner() {
        const element = document.createElement('div')
        element.className = 'chohyo-content-outline-inner'
        return element
    }

    getHeight() {
        return getLayout(this.containerInner).height
    }

    getContentHeight() {
        return getLayout(this.contentOutlineOuter).height
    }
}

const scripts = document.getElementsByTagName('script')
const selfSrc = scripts[scripts.length - 1].src;
const selfDirectory = selfSrc.substr(0, selfSrc.lastIndexOf('/') + 1)

loadScripts([
    selfDirectory + 'lottie.min.js'
], () => {
    bodymovin.loadAnimation({
        container: document.getElementsByClassName('chohyo-indicator')[0],
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: selfDirectory + 'indicator.json'
    })
    waiter.ok()
})
