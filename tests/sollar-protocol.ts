import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { SollarProtocol } from '../target/types/sollar_protocol';

describe('sollar-protocol', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.SollarProtocol as Program<SollarProtocol>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
