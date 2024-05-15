import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TokenNetwork } from '../token/tokenNetwork.entity';
import { Transaction } from '../transaction/transaction.entity';
import { User } from '../user/user.entity';
import { NetworkSwap } from '../networkSwap/networkSwap.entity';

@Entity()
export class Network {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @Column()
  name: string;

  @Column({
    name: 'rpc_url',
  })
  rpcURL: string;

  @Column({
    name: 'chain_id',
  })
  chainId: number;

  @Column({
    name: 'current_symbol',
  })
  currentSymbol: string;

  @Column({
    nullable: true,
    name: 'price_feed_id',
  })
  priceFeedId: string;

  @Column({
    name: 'block_explorer_url',
    nullable: true,
  })
  blockExplorerUrl: string;

  @Column({
    nullable: true,
  })
  thumbnail: string;

  @Column({
    name: 'is_default_network',
    default: false,
  })
  isDefaultNetwork: boolean;

  @Column({
    name: 'is_testnet',
    default: false,
  })
  isTestNet: boolean;

  @OneToOne(() => NetworkSwap, (networkSwap) => networkSwap.network)
  @JoinColumn()
  networkSwap: NetworkSwap;

  @ManyToOne(() => User, (user) => user.networksCreated)
  creator: User;

  @OneToMany(() => TokenNetwork, (tokenNetwork) => tokenNetwork.network)
  tokenNetworks: TokenNetwork[];

  @OneToMany(() => Transaction, (transaction) => transaction.network)
  transactions: Transaction[];

  @ManyToMany(() => User, (user) => user.networks)
  users: User[];

  @OneToMany(() => User, (user) => user.currentSelectedNetwork)
  usersSelected: User[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    nullable: true,
  })
  updatedAt: Date;

  @Column({
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt: Date;
}
