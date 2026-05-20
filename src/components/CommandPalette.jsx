import "react-cmdk/dist/cmdk.css"
import CommandPalette, { filterItems, getItemIndex, useHandleOpenCommandPalette } from "react-cmdk"
import { useState } from "react"
import { useNavigate } from "react-router-dom"



export default function AppCommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()


  useHandleOpenCommandPalette(setOpen)

  const filteredItems = filterItems(
    [
      {
        heading: "Navigation",
        id: "nav",
        items: [
          { id: "dashboard", children: "Tableau de bord",  icon: "HomeIcon",              onClick: () => navigate("/") },
          { id: "clients",   children: "Clients",          icon: "UsersIcon",             onClick: () => navigate("/clients") },
          { id: "tx",        children: "Transactions",     icon: "CreditCardIcon",        onClick: () => navigate("/tx") },
          { id: "objectifs", children: "Objectifs",        icon: "FlagIcon",              onClick: () => navigate("/objectifs") },
          { id: "agents",    children: "Agents & TPE",     icon: "DevicePhoneMobileIcon", onClick: () => navigate("/agents") },
          { id: "settings",  children: "Paramètres",       icon: "CogIcon",               onClick: () => navigate("/settings") },
        ],
      },
    ],
    search
  )

  return (
    <CommandPalette
      onChangeSearch={setSearch}
      onChangeOpen={setOpen}
      search={search}
      isOpen={open}
      placeholder="Rechercher…"
    >
      <CommandPalette.Page id="root">
        {filteredItems.length ? (
          filteredItems.map((list) => (
            <CommandPalette.List key={list.id} heading={list.heading}>
              {list.items.map(({ id, ...rest }) => (
                <CommandPalette.ListItem
                  key={id}
                  index={getItemIndex(filteredItems, id)}
                  {...rest}
                />
              ))}
            </CommandPalette.List>
          ))
        ) : (
          <CommandPalette.FreeSearchAction />
        )}
      </CommandPalette.Page>
    </CommandPalette>
  )
}
