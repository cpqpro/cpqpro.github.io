history.pushState(JSON.parse(localStorage.getItem('cpq')) || {
  product: {},
  route: 'home'
}, 'initial load')

// the router

function route(route) {
  // console.log(route)
  let state = history.state
  const before = Object.assign({}, state)
  state.route = route
  history.pushState(state, route, route)
  console.log(before, history.state)
  localStorage.setItem('cpq', JSON.stringify(history.state))
  render()
}

function reset() { localStorage.removeItem('cpq') }

const routeToIdMap = {
  home: 'Page-Home',
  items: 'Page-Items',
  pricing: 'Page-Pricing',
  products: 'Page-Products',
  'products/new': 'Wizard-Product',
  queues: 'Page-Queues',
  quotes: 'Page-Quotes',
  settings: 'Page-Settings',
  tools: 'Page-Tools',
  users: 'Page-Users',
}

// the conductor

function render() {
  document.getElementById('Page-Content').innerHTML = useTemplate(document.getElementById(routeToIdMap[history.state.route]))
}

function useTemplate(el) {
  const tree = el.cloneNode(true)
  tree.querySelectorAll('*[id]').forEach(el => {
    // strip all underscores so no id appears twice
    el.id = el.id.slice(0, -1)
  })
  return tree.outerHTML
}

// event listeners & handlers

document.addEventListener('render', e => route(e.detail.route))

document.addEventListener('click', e => {
  if (e.target.matches('[data-route]')) handleRoute(e.target)
  if (e.target.matches('[data-tab]')) handleTab(e.target.dataset.tab)
})

document.addEventListener('keyup', e => {
  if (e.target.tagName === 'INPUT') handleInput(e)
  else handleShortcut(e.key)
})

function handleRoute(el) {
  if (el.classList.contains('Tab-Icon-Label')) {
    // remove .selected from siblings
    Array.from(el.parentNode.children).forEach(child => child.classList.remove('selected'))
    // add .selected to clicked element
    el.classList.add('selected')
  }
  // pass route to pub-sub render event
  document.dispatchEvent(new CustomEvent('render', {
    detail: { route: el.dataset.route }
  }))
}

document.addEventListener('tab', e => {
  if (e.detail.tab === 'values') {
    const parent = document.querySelector('.temp-values')
    parent.innerHTML = ''
    const p1 = document.createElement('p')
    p1.textContent = 'For each input, choose a type then add values.'
    parent.appendChild(p1)
    const inputs = history.state.product.inputs
    inputs.forEach((input, i) => {
      const div = document.createElement('div')
      const h3 = document.createElement('h3')
      h3.textContent = input.text
      div.appendChild(h3)
      const type = document.createElement('div')
      type.className = 'temp-types'
      type.innerHTML = '<div class="selected" data-value="choice"><i class="fas fa-ballot"></i> Multiple choice</div><div data-value="number">Number value</div><div data-value="other">Other <i class="fas fa-angle-down"></i><div>'
      div.appendChild(type)
      const ol = document.createElement('ol')
      const li = document.createElement('li')
      const value_1 = document.createElement('input')
      value_1.id = 'product_input_'+ (i + 1) +'_value_1'
      value_1.placeholder = 'First value…'
      li.appendChild(value_1)
      ol.appendChild(li)
      div.appendChild(ol)
      const p2 = document.createElement('p')
      p2.innerHTML = 'To add another value, press <strong>Enter ↵</strong>'
      div.appendChild(p2)
      const button = document.createElement('button')
      if (i === inputs.length - 1) {
        button.textContent = 'Save product'
      } else {
        button.textContent = 'Next input'
      }  
      div.appendChild(button)
      parent.appendChild(div)
    })
  }
})

function handleTab(tab) {
  document.querySelectorAll('.tab-buttons li').forEach(el => el.classList.remove('active'))
  document.querySelector('[data-tab='+ tab +']').classList.add('active')
  document.querySelectorAll('.tab').forEach(el => el.style.display = 'none')
  document.querySelector('.temp-'+ tab).style.display = 'block'
  document.dispatchEvent(new CustomEvent('tab', { detail: { tab } }))
}

function handleInput(e) {
  const p = history.state.product
  const t = e.target
  const s = t.id.split('_')
  if (t.id === 'product_name') {
    const h1 = document.querySelector('#Wizard-Product h1')
    if (t.value) {
      h1.textContent = p.name = t.value
    } else {
      h1.textContent = h1.dataset.placeholder
    }
    if (e.key === 'Enter') { handleTab('inputs') }
  } else if (t.id.startsWith('product_input_')) {
    if (!p.hasOwnProperty('inputs')) p.inputs = []
    let obj
    if (s[4]) {
      if (!p.inputs[s[2] - 1].hasOwnProperty('values')) p.inputs[s[2] - 1].values = []
      obj = p.inputs[s[2] - 1].values[s[4] - 1] = {}
    } else {
      obj = p.inputs[s[2] - 1] = {}
    }
    obj.text = t.value
    if (e.key === 'Enter') {
      const li = document.createElement('li')
      const input = document.createElement('input')
      s.pop()
      input.id = s.join('_') +'_'+ (getParentIndex(t) + 2)
      li.appendChild(input)
      t.parentNode.parentNode.appendChild(li)
      input.focus()
    }
  }
}

function handleShortcut(key) {
  if (key === 'Meta') return
  else if (key === 'Escape') escape()
  else if (key === 'd') toggle('Dev')
  else console.warn('Shortcut not recognized')
}

const layers = []

function escape() {
  if (layers.length) {
    const front = layers.pop()
    front.style.display = 'none'
  }
}

function toggle(id) {
  const el = document.getElementById(id)
  if (el.offsetParent === null) {
    el.style.display = 'block'
    layers.push(el)
  }
  else {
    el.style.display = 'none'
    layers.pop()
  }
}

function getParentIndex(el) {
  // console.log(el.parentNode.parentNode.children, Array.from(el.parentNode.parentNode.children).indexOf(el.parentNode) + 1)
  return Array.from(el.parentNode.parentNode.children).indexOf(el.parentNode)
}

// init

render()