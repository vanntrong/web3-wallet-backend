import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Network } from '../network/network.entity';
import { Token } from '../token/token.entity';

export enum ETransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @Column({
    name: 'transaction_status',
    enum: ETransactionStatus,
    default: ETransactionStatus.PENDING,
  })
  transactionStatus: ETransactionStatus;

  @Column({
    type: 'float',
    name: 'transaction_gas',
    nullable: true,
  })
  transactionGas: number;

  @Column({
    name: 'transaction_hash',
    nullable: true,
  })
  transactionHash: string;

  @Column({
    name: 'block_hash',
    nullable: true,
  })
  blockHash: string;

  @Column({
    name: 'block_number',
    nullable: true,
  })
  blockNumber: number;

  @Column({
    name: 'from_address',
  })
  fromAddress: string;

  @Column({
    name: 'to_address',
  })
  toAddress: string;

  @Column({
    name: 'token_contract_address',
    nullable: true,
  })
  tokenContractAddress: string;

  @Column({
    name: 'max_priority_per_gas',
    nullable: true,
    type: 'float',
  })
  maxPriorityFeePerGas: number;

  @Column({
    name: 'base_fee',
    nullable: true,
    type: 'float',
  })
  baseFee: number;

  @ManyToOne(() => Token)
  token: Token;

  @ManyToOne(() => Network)
  network: Network;

  @Column({
    type: 'float',
  })
  amount: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
