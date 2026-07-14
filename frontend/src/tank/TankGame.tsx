import { useState } from 'react'
import CampaignMenu from './components/CampaignMenu'
import Garage from './components/Garage'
import Shop from './components/Shop'
import BattleView from './components/BattleView'

type View =
  | { screen: 'menu' }
  | { screen: 'garage' }
  | { screen: 'shop' }
  | { screen: 'battle'; kind: 'battle' | 'boss' }

/** Route component for the Tank Battle game: a small screen state machine. */
export default function TankGame() {
  const [view, setView] = useState<View>({ screen: 'menu' })

  if (view.screen === 'battle') {
    return <BattleView kind={view.kind} onDone={() => setView({ screen: 'menu' })} />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {view.screen === 'menu' && (
        <CampaignMenu
          onStartBattle={() => setView({ screen: 'battle', kind: 'battle' })}
          onStartBoss={() => setView({ screen: 'battle', kind: 'boss' })}
          onGarage={() => setView({ screen: 'garage' })}
          onShop={() => setView({ screen: 'shop' })}
        />
      )}
      {view.screen === 'garage' && <Garage onBack={() => setView({ screen: 'menu' })} />}
      {view.screen === 'shop' && <Shop onBack={() => setView({ screen: 'menu' })} />}
    </div>
  )
}
