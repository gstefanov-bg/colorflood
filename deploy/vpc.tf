provider "aws" {
  region  = "eu-central-1"
}

resource "aws_vpc" "kaas-vpc" {
  cidr_block       = "10.0.0.0/16"
  instance_tenancy = "default"

  tags = {
    Name = "kaas-vpc"
  }
}

resource "aws_subnet" "kaas-subnet-public-1" {
    vpc_id = aws_vpc.kaas-vpc.id
    cidr_block = "10.0.1.0/24"
    map_public_ip_on_launch = "true"

	tags = {
        name = "kaas-subnet-public-1"
    }
}

resource "aws_subnet" "kaas-subnet-private-1" {
    vpc_id = aws_vpc.kaas-vpc.id
    cidr_block = "10.0.2.0/24"

	tags = {
        name = "kaas-subnet-private-1"
    }
}
