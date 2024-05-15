import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Network } from '../network/network.entity';
import { UserSecret } from './userSecret.entity';
import { UserNetworkToken } from './userNetworkToken.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @Column({
    name: 'name',
    nullable: true,
  })
  name: string;

  @Column({
    unique: true,
    nullable: true,
  })
  @Index({
    unique: true,
  })
  email: string;

  @Column({
    name: 'address',
  })
  address: string;

  @Column({
    name: 'password',
    nullable: true,
  })
  password: string;

  @Column({
    nullable: true,
  })
  avatar: string;

  @OneToOne(() => UserSecret)
  @JoinColumn()
  secret: UserSecret;

  @ManyToMany(() => Network, (network) => network.users)
  @JoinTable()
  networks: Network[];

  @OneToMany(
    () => UserNetworkToken,
    (userNetworkToken) => userNetworkToken.user,
  )
  userNetworkToken: UserNetworkToken[];

  @OneToMany(() => Network, (network) => network.creator)
  networksCreated: Network[];

  @ManyToOne(() => Network, (network) => network.usersSelected)
  currentSelectedNetwork: Network;

  @Column({
    type: 'varchar',
    array: true,
    default: [],
    name: 'push_notification_tokens',
  })
  pushNotificationTokens: string[];

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
